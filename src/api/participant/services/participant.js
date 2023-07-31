"use strict";

/**
 * participant service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService(
  "api::participant.participant",
  ({ strapi }) => ({
    async isUserAlreadyParticipant(userId, eventUid, categoryUid) {
      const result = await strapi.entityService.findMany(
        "api::participant.participant",
        {
          filters: {
            user_id: userId,
            event_uid: eventUid,
            category_uid: categoryUid,
          },
        }
      );

      if (result.length < 1) {
        return null;
      } else {
        return result[0].id;
      }
    },
    async updateParticipantData(userDetailId, participantId, paymentId) {
      // get updated user detail first
      const { user_detail } = await strapi.entityService.findOne(
        "api::user-detail.user-detail",
        userDetailId,
        {
          populate: {
            user_detail: {
              fields: "*",
            },
          },
        }
      );

      delete user_detail.id;

      // gain previous payment data
      const { payments } = await strapi.entityService.findOne(
        "api::participant.participant",
        participantId,
        {
          populate: {
            payments: {
              fields: ["id"],
            },
          },
        }
      );

      const arrPaymentId = payments.map((pay) => pay.id);
      arrPaymentId.push(paymentId);

      const updatedParticipant = await strapi.entityService.update(
        "api::participant.participant",
        participantId,
        {
          data: {
            user_detail,
            payments: arrPaymentId,
          },
        }
      );
    },

    async addParticipantToEvent(
      userDetailId,
      categoryUid,
      eventUid,
      paymentId
    ) {
      const { user_detail, user } = await strapi.entityService.findOne(
        "api::user-detail.user-detail",
        userDetailId,
        {
          populate: {
            user_detail: {
              fields: "*",
            },
            user: {
              fields: ["id"],
            },
          },
        }
      );

      console.log(
        "addParticipantToEvent - userDetail & user: ",
        user_detail,
        user
      );

      const participantPendingPayment = await strapi.entityService.create(
        "api::participant.participant",
        {
          data: {
            user_detail,
            user_id: `${user.id}`,
            category_uid: categoryUid,
            event_uid: eventUid,
            payments: paymentId,
          },
        }
      );

      console.log(
        "addParticipantToEvent - participant: ",
        participantPendingPayment
      );
    },
    async updateParticipantAfterPayment(invoice_id) {
      try {
        const { id: participantId, category_uid } = await strapi
          .service("api::participant.participant")
          .getParticipantWithInvoice(invoice_id);

        const bibNumber = await strapi
          .service("api::participant.participant")
          .createBibNumber(category_uid);

        // update participant with BIB
        const updatedParticipant = await strapi.entityService.update(
          "api::participant.participant",
          participantId,
          {
            data: {
              bib: bibNumber,
            },
          }
        );

        console.log(
          "updateParticipantAfterPayment final: ",
          updatedParticipant
        );
      } catch (error) {
        throw error;
      }
    },
    async createBibNumber(category_uid) {
      // count participant first
      let lastBib = await strapi.db
        .query("api::participant.participant")
        .findOne({
          select: "bib",
          orderBy: { bib: "desc" },
          where: {
            category_uid: category_uid,
          },
        });

      let bibNumber = lastBib.bib;

      // add +1 because counting on bib number that not null
      bibNumber++;

      console.log("updateParticipantAfterPayment - count: ", bibNumber);

      return bibNumber;
    },
    async getParticipantWithInvoice(invoice_id) {
      const participantsWithInvoice = await strapi.entityService.findMany(
        "api::participant.participant",
        {
          filters: {
            payments: {
              invoice_id: {
                $contains: invoice_id,
              },
            },
          },
          populate: {
            user_detail: "*",
            payments: "*",
          },
        }
      );

      if (participantsWithInvoice.length < 1) {
        throw {
          status: 404,
          message: `Participant with invoice ${invoice_id} did not found!`,
        };
      }

      return participantsWithInvoice[0];
    },
    async sendRegistrationSuccessEmail(invoice_id) {
      const { category_uid, user_detail, payments, bib } = await strapi
        .service("api::participant.participant")
        .getParticipantWithInvoice(invoice_id);

      try {
        const invoiceSelected = payments.filter((payment) => {
          return payment.invoice_id == invoice_id;
        });

        if (invoiceSelected.length < 1) {
          throw {
            status: 404,
            message: `Invoice ID ${invoice_id} strangely not found!`,
          };
        }

        const { external_id, channel } = invoiceSelected[0];

        const { eventName, categoryName } = await strapi
          .service("api::category.category")
          .getEventAndCategoryName(category_uid);

        const content = gtrEmailTemplate({
          user_detail,
          bib,
          eventName,
          categoryName,
          external_id,
          channel,
        });

        await strapi
          .plugin("email")
          .service("email")
          .send({
            to: user_detail.email,
            bcc: `escapenice.event@gmail.com${
              process.env.NODE_ENV == "prod" ? ",escape.nice@gmail.com" : ""
            }`,
            from: `Escape Nice <${process.env.MAIL_FROM}>`,
            subject: `Pendaftaran ${eventName}`,
            html: content,
          });
      } catch (error) {
        throw error;
      }
    },
  })
);

const gtrEmailTemplate = ({
  user_detail,
  bib,
  eventName,
  categoryName,
  external_id,
  channel,
}) => {
  return `
  <p>&nbsp;</p>
<!-- [if mso]><xml> <o:OfficeDocumentSettings> <o:AllowPNG/> <o:PixelsPerInch>96</o:PixelsPerInch> </o:OfficeDocumentSettings> </xml><![endif]-->
<table class="nl2go-body-table" style="width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td>
<table class="r0-o" style="table-layout: fixed; width: 600px;" role="presentation" border="0" width="600" cellspacing="0" cellpadding="0" align="center">
<tbody>
<tr>
<td valign="top">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r1-c" align="center">
<table class="r2-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" align="center"><!-- -->
<tbody>
<tr>
<td class="r3-i" style="background-color: #ffffff; padding-bottom: 20px; padding-top: 20px;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<th class="r4-c" style="font-weight: normal;" valign="top" width="100%">
<table class="r5-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><!-- -->
<tbody>
<tr>
<td class="r6-i" style="padding-left: 15px; padding-right: 15px;" valign="top">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r1-c" align="center">
<table class="r2-o" style="table-layout: fixed; width: 200px;" role="presentation" border="0" width="200" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td style="font-size: 0px; line-height: 0px;"><img style="display: block; width: 100%;" src="https://img.mailinblue.com/6198928/images/content_library/original/648905d7db72ee3dbe2f2eea.png" width="200" border="0" /></td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</th>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r1-c" align="center">
<table class="r2-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" align="center"><!-- -->
<tbody>
<tr>
<td class="r7-i" style="background-color: #ffffff; padding-bottom: 20px; padding-top: 20px;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<th class="r4-c" style="font-weight: normal;" valign="top" width="100%">
<table class="r5-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><!-- -->
<tbody>
<tr>
<td class="r6-i" valign="top">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r10-i nl2go-default-textstyle" style="color: #3b3f44; font-family: Arial; font-size: 18px; word-break: break-word; line-height: 1.5; padding-top: 15px; text-align: center;" align="center" valign="top">
<div>
<h1 class="default-heading1" style="margin: 0; color: #1f2d3d; font-family: Arial; font-size: 36px; word-break: break-word;">Pendaftaran Anda berhasil!</h1>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r1-c" align="center">
<table class="r11-o" style="table-layout: fixed; width: 600px;" role="presentation" border="0" width="600" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r12-i" style="font-size: 0px; line-height: 0px; padding-bottom: 15px; padding-top: 15px;"><img style="display: block; width: 100%;" src="https://img.mailinblue.com/6198928/images/content_library/original/648907aabb200502bd742fe1.png" width="600" border="0" /></td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r13-i nl2go-default-textstyle" style="color: #3b3f44; font-family: Arial; font-size: 18px; word-break: break-word; line-height: 1.5; padding-top: 15px; text-align: left;" align="left" valign="top">
<h3 class="default-heading3" style="margin: 0; color: #1f2d3d; font-family: Arial; font-size: 24px; word-break: break-word;">${eventName}</h3>
<h3 class="default-heading3" style="margin: 0; color: #1f2d3d; font-family: Arial; font-size: 24px; word-break: break-word;">Nomor BIB: ${bib}</h3>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r14-i nl2go-default-textstyle" style="color: #3b3f44; font-family: Arial; font-size: 18px; line-height: 1.5; word-break: break-word; padding-bottom: 15px; padding-top: 15px; text-align: left; word-wrap: break-word;" align="left" valign="top">
<div>
<div>
<p style="margin: 0;">Berikut adalah detail registrasi Anda:</p>
<p style="margin: 0;">&nbsp;</p>
<p style="margin: 0;">Nomor Pembayaran: <strong>${external_id}</strong><br />Pembayaran: <strong>${channel}</strong><br />Kategori: <strong>${categoryName}</strong><br />Nama Lengkap: <strong>${
    user_detail.name
  }</strong><br />Nama BIB: <strong>${
    user_detail.bib_name
  }</strong><br />Tanggal Lahir: <strong>${user_detail.dob}</strong></p>
</div>
</div>
<div>
<div>
<p style="margin: 0;">Jenis Kelamin: <strong>${
    user_detail.gender
  }&nbsp;</strong></p>
</div>
</div>
<div>
<div>
<p style="margin: 0;">No. HP: <strong>${user_detail.phone}</strong></p>
</div>
</div>
<div>
<div>
<p style="margin: 0;">Alamat: <strong>${user_detail.address}</strong></p>
</div>
</div>
<div>
<div>
<p style="margin: 0;">Nama Klub: <strong>${user_detail.club}&nbsp;</strong></p>
</div>
</div>
<div>
<div>
<div>
<p style="margin: 0;">Kontak Darurat: <strong>${user_detail.emergency_name} - ${
    user_detail.emergency_number
  }</strong></p>
</div>
</div>
</div>
<div>
<div>
<p style="margin: 0;">Jersey Size: <strong>${user_detail.tshirt_size.toUpperCase()}</strong>&nbsp;</p>
</div>
</div>
<div>
<p style="margin: 0;">&nbsp;</p>
<p style="margin: 0;">Silahkan tunjukkan email ini saat pengambilan Race Pack.</p>
<p style="margin: 0;">Apabila ada perubahan data, harap hubungi admin.<br />Ikuti terus informasi terkini via web kami.</p>
<p style="margin: 0;">&nbsp;</p>
<p style="margin: 0;">Terima kasih,</p>
<p style="margin: 0;">&nbsp;</p>
<p style="margin: 0;">Salam.</p>
<p style="margin: 0;">Escape Nice Apparel Indonesia</p>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r1-c" align="center">
<table class="r15-o" style="table-layout: fixed; width: 300px;" role="presentation" border="0" width="300" cellspacing="0" cellpadding="0">
<tbody>
<tr class="nl2go-responsive-hide">
<td style="font-size: 15px; line-height: 15px;" height="15">&shy;</td>
</tr>
<tr>
<td class="r16-i nl2go-default-textstyle" style="color: #3b3f44; font-family: Arial; font-size: 18px; line-height: 1.5; word-break: break-word;" align="center" valign="top" height="18"><!-- [if mso]> <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="#top" style="v-text-anchor:middle; height: 41px; width: 299px;" arcsize="10%" fillcolor="#2aa0cd" strokecolor="#2aa0cd" strokeweight="1px" data-btn="1"> <w:anchorlock> </w:anchorlock> <v:textbox inset="0,0,0,0"> <div style="display:none;"> <center class="default-button"><span>Masuk ke website</span></center> </div> </v:textbox> </v:roundrect> <![endif]--> <!-- [if !mso]><!-- --> <a class="r17-r default-button" style="font-style: normal; font-weight: bold; line-height: 1.15; text-decoration: none; word-break: break-word; word-wrap: break-word; display: inline-block; -webkit-text-size-adjust: none; background-color: #2aa0cd; border-radius: 4px; color: #ffffff; font-family: Arial; font-size: 16px; height: 18px; mso-hide: all; width: 290px; padding: 12px 5px 12px 5px; border: 0px solid #2aa0cd;" href="https://escape-nice.id" target="_blank" rel="noopener" data-btn="1"> Masuk ke website</a> <!--<![endif]--></td>
</tr>
<tr class="nl2go-responsive-hide">
<td style="font-size: 15px; line-height: 15px;" height="15">&shy;</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</th>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r1-c" align="center">
<table class="r2-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0" align="center"><!-- -->
<tbody>
<tr>
<td class="r18-i" style="background-color: #eff2f7; padding-bottom: 20px; padding-top: 20px;">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<th class="r4-c" style="font-weight: normal;" valign="top" width="100%">
<table class="r5-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0"><!-- -->
<tbody>
<tr>
<td class="r6-i" style="padding-left: 15px; padding-right: 15px;" valign="top">
<table role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r19-i nl2go-default-textstyle" style="font-family: Arial; word-break: break-word; color: #3b3f44; font-size: 18px; line-height: 1.5; padding-top: 15px; text-align: center;" align="center" valign="top">
<div>
<p style="margin: 0;"><strong>Escape Nice Apparel Indonesia</strong></p>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r20-i nl2go-default-textstyle" style="font-family: Arial; word-break: break-word; color: #3b3f44; font-size: 18px; line-height: 1.5; text-align: center;" align="center" valign="top">
<div>
<p style="margin: 0;"><span style="font-size: 13px;">Kemang Melati 10 S33, Kemang Pratama 2, Bojong Rawalumbu, Rawalumbu, Bekasi 17117</span></p>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r8-c" align="left">
<table class="r9-o" style="table-layout: fixed; width: 100%;" role="presentation" border="0" width="100%" cellspacing="0" cellpadding="0">
<tbody>
<tr>
<td class="r21-i nl2go-default-textstyle" style="font-family: Arial; word-break: break-word; color: #3b3f44; font-size: 18px; line-height: 1.5; padding-bottom: 15px; padding-top: 15px; text-align: center;" align="center" valign="top">
<div>
<p style="margin: 0; font-size: 14px;">Copyright &copy; All Rights Reserved</p>
</div>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
<tr>
<td class="r22-c" align="center">&nbsp;</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</th>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
</td>
</tr>
</tbody>
</table>
  `;
  //   return `

  // <!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
  // <html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
  // <head>
  //     <meta charset="UTF-8">
  //     <meta content="width=device-width, initial-scale=1" name="viewport">
  //     <meta name="x-apple-disable-message-reformatting">
  //     <meta http-equiv="X-UA-Compatible" content="IE=edge">
  //     <meta content="telephone=no" name="format-detection">
  //     <title></title>
  //     <!--[if (mso 16)]>
  //     <style type="text/css">
  //     a {text-decoration: none;}
  //     </style>
  //     <![endif]-->
  //     <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
  //     <!--[if gte mso 9]>
  // <xml>
  //     <o:OfficeDocumentSettings>
  //     <o:AllowPNG></o:AllowPNG>
  //     <o:PixelsPerInch>96</o:PixelsPerInch>
  //     </o:OfficeDocumentSettings>
  // </xml>
  // <![endif]-->
  // </head>
  // <body>
  //     <div class="es-wrapper-color">
  //         <!--[if gte mso 9]>
  //             <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
  //                 <v:fill type="tile" color="#f6f6f6"></v:fill>
  //             </v:background>
  //         <![endif]-->
  //         <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
  //             <tbody>
  //                 <tr>
  //                     <td class="esd-email-paddings" valign="top">
  //                         <table class="esd-header-popover es-header" cellspacing="0" cellpadding="0" align="center">
  //                             <tbody>
  //                                 <tr>
  //                                     <td class="esd-stripe" align="center">
  //                                     </td>
  //                                 </tr>
  //                             </tbody>
  //                         </table>
  //                         <table class="es-content" cellspacing="0" cellpadding="0" align="center">
  //                             <tbody>
  //                                 <tr>
  //                                     <td class="esd-stripe" align="center">
  //                                         <table class="es-content-body" width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
  //                                             <tbody>
  //                                                 <tr>
  //                                                     <td class="es-p20t es-p20r es-p20l esd-structure" align="left">
  //                                                         <table width="100%" cellspacing="0" cellpadding="0">
  //                                                             <tbody>
  //                                                                 <tr>
  //                                                                     <td class="esd-container-frame" width="560" valign="top" align="center">
  //                                                                         <table width="100%" cellspacing="0" cellpadding="0">
  //                                                                             <tbody>
  //                                                                                 <tr>
  //                                                                                     <td align="center" class="esd-block-text">
  //                                                                                         <p><h1>Terima kasih anda telah mendaftar di <br>${eventName}</h1></p>
  //                                                                                         <p><br></p>
  //                                                                                         <p>Berikut adalah detail registrasi anda:<br><br></p>
  //                                                                                         <h3>Nomor BIB: <b>${bib}</b></h3>
  //                                                                                         <p><br>Invoice: <b>${external_id}</b><br>Pembayaran: <b>${channel}</b><br>Kategori: <b>${categoryName}</b>&nbsp;<br><br>-----------<br>Nama BIB: <b>${user_detail.bib_name}</b>&nbsp;<br>Tanggal Lahir: <b>${user_detail.dob}</b>&nbsp;<br>Jenis Kelamin: <b>${user_detail.gender}</b>&nbsp;<br>No. HP: <b>${user_detail.phone}</b>&nbsp;<br>Alamat: <b>${user_detail.address}</b>&nbsp;<br><br>-----------<br>Nama Klub: <b>${user_detail.club}</b>&nbsp;<br>Kontak Darurat: <b>${user_detail.emergency_name} - ${user_detail.emergency_number}</b>&nbsp;<br>Jersey Size: <b>${user_detail.tshirt_size}</b>&nbsp;<br>Bila ada keraguan atau permintaan perubahan data, dapat hubungi narahubung:</p>
  //                                                                                         <p>Website: <a href="https://escape-nice.id/" target="_blank">https://escape-nice.id</a></p>
  //                                                                                         <p>Instagram:....</p>
  //                                                                                         <p><br></p>
  //                                                                                         <p>Salam,</p>
  //                                                                                         <p><br></p>
  //                                                                                         <p><strong>Escape Nice</strong></p>
  //                                                                                     </td>
  //                                                                                 </tr>
  //                                                                             </tbody>
  //                                                                         </table>
  //                                                                     </td>
  //                                                                 </tr>
  //                                                             </tbody>
  //                                                         </table>
  //                                                     </td>
  //                                                 </tr>
  //                                             </tbody>
  //                                         </table>
  //                                     </td>
  //                                 </tr>
  //                             </tbody>
  //                         </table>
  //                         <table class="esd-footer-popover es-footer" cellspacing="0" cellpadding="0" align="center">
  //                             <tbody>
  //                                 <tr>
  //                                     <td class="esd-stripe" align="center">
  //                                         <table class="es-footer-body" width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
  //                                             <tbody>
  //                                                 <tr>
  //                                                     <td class="esd-structure es-p20t es-p20r es-p20l" align="left">
  //                                                         <table cellpadding="0" cellspacing="0" width="100%">
  //                                                             <tbody>
  //                                                                 <tr>
  //                                                                     <td width="560" class="esd-container-frame" align="center" valign="top">
  //                                                                         <table cellpadding="0" cellspacing="0" width="100%">
  //                                                                             <tbody>

  //                                     <img class="adapt-img" src="https://i.ibb.co/87t63pH/escape-logo.png" alt width="100%" style="display: block;">

  //                                                                             </tbody>
  //                                                                         </table>
  //                                                                     </td>
  //                                                                 </tr>
  //                                                             </tbody>
  //                                                         </table>
  //                                                     </td>
  //                                                 </tr>
  //                                             </tbody>
  //                                         </table>
  //                                     </td>
  //                                 </tr>
  //                             </tbody>
  //                         </table>
  //                     </td>
  //                 </tr>
  //             </tbody>
  //         </table>
  //     </div>
  // </body>
  // </html>
  //     `;
};
