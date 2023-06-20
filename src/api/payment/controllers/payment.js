"use strict";

/**
 * payment controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController("api::payment.payment", ({ strapi }) => ({
  async createInvoice(ctx, next) {
    const body = ctx.request.body;

    const {
      email,
      eventName,
      eventUid,
      categoryName,
      categoryUid,
      userDetailId,
      price,
      phone,
      bib_name,
      code,
      userId,
    } = body;

    // create payment invoice using midtrans sdk
    const midtransClient = require("midtrans-client");

    const snap = new midtransClient.Snap({
      isProduction: process.env.NODE_ENV == "prod",
      serverKey: process.env.MIDTRANS_SECRET,
    });

    const external_id = `escape-${Date.now()}`;
    const status = "PENDING";

    const parameters = {
      transaction_details: {
        order_id: external_id,
        gross_amount: price,
      },
      item_details: [
        {
          id: "1",
          price: price,
          quantity: 1,
          name: `${eventName} - ${categoryName}`,
        },
      ],
      customer_details: {
        first_name: bib_name,
        email: email,
        phone: phone,
      },
    };

    try {
      const invoice = await snap.createTransaction(parameters);

      const { token, redirect_url: invoice_url } = invoice;

      console.log("Invoice created: ", invoice);

      // add invoice to the Payment data
      const paymentEntry = await strapi.entityService.create(
        "api::payment.payment",
        {
          data: {
            invoice_id: external_id,
            invoice_url,
            external_id,
            amount: price,
            status,
            token,
            coupon: code,
          },
        }
      );

      try {
        // check if participant already have data
        const participantId = await strapi
          .service("api::participant.participant")
          .isUserAlreadyParticipant(userId, eventUid, categoryUid);

        if (participantId != null) {
          // just update the data
          await strapi
            .service("api::participant.participant")
            .updateParticipantData(
              userDetailId,
              participantId,
              paymentEntry.id
            );
        } else {
          // add to participant (without BIB)

          await strapi
            .service("api::participant.participant")
            .addParticipantToEvent(
              userDetailId,
              categoryUid,
              eventUid,
              paymentEntry.id
            );
        }
      } catch (error) {
        console.log("Error @ add participant service: ", error);
      }

      ctx.response.status = 201;
      ctx.response.body = {
        invoice_id: external_id,
        invoice_url,
        external_id,
        amount: price,
        status,
        token,
      };
    } catch (error) {
      console.log("error @ creating invoice: ", error);
      ctx.response.status = 500;
      ctx.response.message = error.message;
      ctx.response.body = JSON.parse(error);
    }
  },
  async receivePayment(ctx) {
    try {
      const body = ctx.request.body;

      console.log("body receive payment: ", body);

      const {
        transaction_status,
        gross_amount: amount,
        transaction_id: webhookId,
        order_id: id,
        payment_type: payment_channel,
        signature_key,
        status_code,
      } = body;

      // check signature key
      const raw = `${id}${status_code}${amount}${process.env.MIDTRANS_SECRET}`;
      var crypto = require("crypto");
      const key = crypto.createHash("sha512").update(raw).digest("hex");

      if (signature_key != key) {
        ctx.response.status = 403;
        ctx.response.body = "Signature invalid!";
        return;
      }

      let status = "PENDING";

      if (
        transaction_status == "capture" ||
        transaction_status == "settlement"
      ) {
        status = "PAID";
      } else if (
        transaction_status == "expire" ||
        transaction_status == "cancel" ||
        transaction_status == "deny"
      ) {
        status = "EXPIRED";
      }

      await strapi.db.query("api::payment.payment").update({
        where: {
          invoice_id: id,
        },
        data: {
          status,
          payment_channel,
          webhook_id: webhookId,
          channel: payment_channel,
        },
      });

      // TODO handle expired transaction!
      if (status != "PAID") {
        ctx.response.status = 200;
        return;
      }

      // update paid user to participant table
      try {
        await strapi
          .service("api::participant.participant")
          .updateParticipantAfterPayment(id);
      } catch (error) {
        console.log("error @ update service: ", error);

        const { status, message } = error;

        ctx.response.status = status | 500;
        ctx.response.message =
          message | "Internal Server Error - Update Participant Error";
        return;
      }

      await strapi
        .service("api::participant.participant")
        .sendRegistrationSuccessEmail(id);

      ctx.response.status = 200;
    } catch (error) {
      console.log("Error @ receive payment: ", error);
      ctx.response.status = 500;
      ctx.response.message = error.message;
      ctx.response.body = JSON.parse(error);
    }
  },
}));
