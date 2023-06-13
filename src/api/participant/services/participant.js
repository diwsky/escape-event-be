"use strict";

/**
 * participant service
 */

const { createCoreService } = require("@strapi/strapi").factories;

const composeEmail = ({
  user_detail,
  bib,
  eventName,
  categoryName,
  external_id,
  channel,
}) => {
  console.log(user_detail);
  return `
  <h1>Terima kasih anda telah mendaftar di ${eventName}!</h1>
  <body>Berikut adalah detail registrasi anda:</body><br/>
  <br/>
  <h3>Nomor BIB: <b>${bib}</b></h3>
  <br/>
  Nomor pembayaran: <b>${external_id}</b><br/>
  Pembayaran: <b>${channel}</b><br/>
  Kategori: <b>${eventName} - ${categoryName}</b><br/>
  <br/>
  -----------
  <br/>
  Nama BIB: <b>${user_detail.bib_name}</b><br/>
  Tanggal Lahir: <b>${user_detail.dob}</b><br/>
  Jenis Kelamin: <b>${user_detail.gender}</b><br/>
  No. HP: <b>${user_detail.phone}</b><br/>
  Alamat: <b>${user_detail.address}</b><br/>
  <br/>
  -----------
  <br/>
  Nama Klub: <b>${user_detail.club}</b><br/>
  Kontak Darurat: <b>${user_detail.emergency_name} - ${user_detail.emergency_number}</b><br/>
  Jersey Size: <b>${user_detail.tshirt_size}</b><br/>
  
  Bila ada keraguan atau permintaan perubahan data, dapat hubungi narahubung:

  Website: https://escape-nice.id
  Instagram:....

  Salam,

  Escape Nice
  `;
};

module.exports = createCoreService(
  "api::participant.participant",
  ({ strapi }) => ({
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
      const participantCountAtCategory = await strapi.db
        .query("api::participant.participant")
        .count({
          where: {
            $and: [
              {
                category_uid,
              },
              {
                payments: {
                  status: "PAID",
                },
              },
            ],
          },
        });

      console.log(
        "updateParticipantAfterPayment - count: ",
        participantCountAtCategory
      );

      const categoryBibs = await strapi.entityService.findMany(
        "api::category.category",
        {
          fields: ["bib_category"],
          filters: {
            uid: category_uid,
          },
        }
      );

      if (categoryBibs.length < 1) {
        throw {
          status: 404,
          message: `Category BIB for ${category_uid} not yet set!`,
        };
      }

      const { bib_category } = categoryBibs[0];

      const bibNumber = `${bib_category}${participantCountAtCategory
        .toString()
        .padStart(3, "0")}`;

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

      console.log("participant: ", participantsWithInvoice[0]);

      return participantsWithInvoice[0];
    },
    async sendRegistrationSuccessEmail(invoice_id) {
      const {
        category_uid,
        user_detail,
        payments: [{ external_id, channel }],
        bib,
      } = await strapi
        .service("api::participant.participant")
        .getParticipantWithInvoice(invoice_id);

      try {
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

        await strapi.plugin("email").service("email").send({
          to: "escapenice.event@gmail.com",
          from: "escapenice.event@gmail.com",
          subject: "Confirmation!",
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
    
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="UTF-8">
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <meta name="x-apple-disable-message-reformatting">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta content="telephone=no" name="format-detection">
    <title></title>
    <!--[if (mso 16)]>
    <style type="text/css">
    a {text-decoration: none;}
    </style>
    <![endif]-->
    <!--[if gte mso 9]><style>sup { font-size: 100% !important; }</style><![endif]-->
    <!--[if gte mso 9]>
<xml>
    <o:OfficeDocumentSettings>
    <o:AllowPNG></o:AllowPNG>
    <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings>
</xml>
<![endif]-->
</head>
<body>
    <div class="es-wrapper-color">
        <!--[if gte mso 9]>
            <v:background xmlns:v="urn:schemas-microsoft-com:vml" fill="t">
                <v:fill type="tile" color="#f6f6f6"></v:fill>
            </v:background>
        <![endif]-->
        <table class="es-wrapper" width="100%" cellspacing="0" cellpadding="0">
            <tbody>
                <tr>
                    <td class="esd-email-paddings" valign="top">
                        <table class="esd-header-popover es-header" cellspacing="0" cellpadding="0" align="center">
                            <tbody>
                                <tr>
                                    <td class="esd-stripe" align="center">
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                        <table class="es-content" cellspacing="0" cellpadding="0" align="center">
                            <tbody>
                                <tr>
                                    <td class="esd-stripe" align="center">
                                        <table class="es-content-body" width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
                                            <tbody>
                                                <tr>
                                                    <td class="es-p20t es-p20r es-p20l esd-structure" align="left">
                                                        <table width="100%" cellspacing="0" cellpadding="0">
                                                            <tbody>
                                                                <tr>
                                                                    <td class="esd-container-frame" width="560" valign="top" align="center">
                                                                        <table width="100%" cellspacing="0" cellpadding="0">
                                                                            <tbody>
                                                                                <tr>
                                                                                    <td align="center" class="esd-block-text">
                                                                                        <p><h1>Terima kasih anda telah mendaftar di <br>${eventName}</h1></p>
                                                                                        <p><br></p>
                                                                                        <p>Berikut adalah detail registrasi anda:<br><br></p>
                                                                                        <h3>Nomor BIB: <b>${bib}</b></h3>
                                                                                        <p><br>Invoice: <b>${external_id}</b><br>Pembayaran: <b>${channel}</b><br>Kategori: <b>${categoryName}</b>&nbsp;<br><br>-----------<br>Nama BIB: <b>${user_detail.bib_name}</b>&nbsp;<br>Tanggal Lahir: <b>${user_detail.dob}</b>&nbsp;<br>Jenis Kelamin: <b>${user_detail.gender}</b>&nbsp;<br>No. HP: <b>${user_detail.phone}</b>&nbsp;<br>Alamat: <b>${user_detail.address}</b>&nbsp;<br><br>-----------<br>Nama Klub: <b>${user_detail.club}</b>&nbsp;<br>Kontak Darurat: <b>${user_detail.emergency_name} - ${user_detail.emergency_number}</b>&nbsp;<br>Jersey Size: <b>${user_detail.tshirt_size}</b>&nbsp;<br>Bila ada keraguan atau permintaan perubahan data, dapat hubungi narahubung:</p>
                                                                                        <p>Website: <a href="https://escape-nice.id/" target="_blank">https://escape-nice.id</a></p>
                                                                                        <p>Instagram:....</p>
                                                                                        <p><br></p>
                                                                                        <p>Salam,</p>
                                                                                        <p><br></p>
                                                                                        <p><strong>Escape Nice</strong></p>
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
                        <table class="esd-footer-popover es-footer" cellspacing="0" cellpadding="0" align="center">
                            <tbody>
                                <tr>
                                    <td class="esd-stripe" align="center">
                                        <table class="es-footer-body" width="600" cellspacing="0" cellpadding="0" bgcolor="#ffffff" align="center">
                                            <tbody>
                                                <tr>
                                                    <td class="esd-structure es-p20t es-p20r es-p20l" align="left">
                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                            <tbody>
                                                                <tr>
                                                                    <td width="560" class="esd-container-frame" align="center" valign="top">
                                                                        <table cellpadding="0" cellspacing="0" width="100%">
                                                                            <tbody>
                                                                                
                                    <img class="adapt-img" src="https://i.ibb.co/87t63pH/escape-logo.png" alt width="100%" style="display: block;">

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
    </div>
</body>
</html>
    `;
};
