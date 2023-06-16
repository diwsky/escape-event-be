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
    } = body;

    // create payment invoice using xendit sdk
    const Xendit = require("xendit-node");
    const x = new Xendit({ secretKey: process.env.XENDIT_SECRET });

    const { Invoice } = x;
    const invoiceSpecificOptions = {};
    const i = new Invoice(invoiceSpecificOptions);

    try {
      const invoice = await i.createInvoice({
        externalID: `escape-${Date.now()}`,
        description: `${eventName} - ${categoryName}`,
        amount: price,
        customer: {
          mobile_number: phone,
          email: email,
          given_names: bib_name,
        },
        should_send_email: true,
        customer_notification_preference: {
          invoice_created: ["whatsapp", "email"],
          invoice_paid: ["whatsapp", "email"],
        },
      });

      console.log("Invoice created: ", invoice);

      const { id, invoice_url, external_id, amount, status } = invoice;

      // add invoice to the Payment data
      const paymentEntry = await strapi.entityService.create(
        "api::payment.payment",
        {
          data: {
            invoice_id: id,
            invoice_url,
            external_id,
            amount,
            status,
          },
        }
      );

      // add to participant (without BIB)
      try {
        strapi
          .service("api::participant.participant")
          .addParticipantToEvent(
            userDetailId,
            categoryUid,
            eventUid,
            paymentEntry.id
          );
      } catch (error) {
        console.log("Error @ add participant service: ", error);
      }

      ctx.response.status = 201;
      ctx.response.body = {
        invoice_id: id,
        invoice_url,
        external_id,
        amount,
        status,
      };
    } catch (error) {
      console.log("error @ creating invoice: ", error);
      ctx.response.status = 500;
      ctx.response.message = error.message;
      ctx.response.body = JSON.parse(error);
    }
  },
  async createMtInvoice(ctx, next) {
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
    } = body;

    // create payment invoice using xendit sdk
    const Xendit = require("xendit-node");
    const x = new Xendit({ secretKey: process.env.XENDIT_SECRET });

    const { Invoice } = x;
    const invoiceSpecificOptions = {};
    const i = new Invoice(invoiceSpecificOptions);

    try {
      const invoice = await i.createInvoice({
        externalID: `escape-${Date.now()}`,
        description: `${eventName} - ${categoryName}`,
        amount: price,
        customer: {
          mobile_number: phone,
          email: email,
          given_names: bib_name,
        },
        should_send_email: true,
        customer_notification_preference: {
          invoice_created: ["whatsapp", "email"],
          invoice_paid: ["whatsapp", "email"],
        },
      });

      console.log("Invoice created: ", invoice);

      const { id, invoice_url, external_id, amount, status } = invoice;

      // add invoice to the Payment data
      const paymentEntry = await strapi.entityService.create(
        "api::payment.payment",
        {
          data: {
            invoice_id: id,
            invoice_url,
            external_id,
            amount,
            status,
          },
        }
      );

      // add to participant (without BIB)
      try {
        strapi
          .service("api::participant.participant")
          .addParticipantToEvent(
            userDetailId,
            categoryUid,
            eventUid,
            paymentEntry.id
          );
      } catch (error) {
        console.log("Error @ add participant service: ", error);
      }

      ctx.response.status = 201;
      ctx.response.body = {
        invoice_id: id,
        invoice_url,
        external_id,
        amount,
        status,
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
      const headers = ctx.request.headers;
      const body = ctx.request.body;

      const webhookId = headers["webhook-id"];
      const token = headers["x-callback-token"];

      // check if token is not same (not from xendit), reject!
      if (token != process.env.XENDIT_CALLBACK_TOKEN) {
        ctx.response.status = 403;
        ctx.response.message = "Identity not valid!";
        return;
      }

      // check if webhook duplicate, reject!
      const duplicateWebhook = await strapi.entityService.findMany(
        "api::payment.payment",
        {
          filters: {
            webhook_id: webhookId,
          },
        }
      );

      if (duplicateWebhook.length > 0) {
        ctx.response.status = 409;
        ctx.response.message = "Duplicate callback!";
        console.log("Error @ receive payment - duplicate webhook!");
        return;
      }

      // update the payment status
      const { id, status, payment_channel } = body;

      const updated = await strapi.db.query("api::payment.payment").update({
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
