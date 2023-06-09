"use strict";

/**
 * payment controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = ({ env }) => ({
  createCoreController("api::payment.payment", ({ strapi }) => ({
    async getInvoice(ctx, next) {
      try {
        const body = ctx.body;
      } catch (err) {
        ctx.body = err;
      }
    },
    async createInvoice(ctx, next) {
      try {
        const body = ctx.request.body;
        const query = ctx.request.query;

        console.log("body: ", body);
        console.log("query: ", query);

        // create payment invoice using xendit sdk
        const Xendit = require("xendit-node");
        const x = new Xendit({ secretKey: process.env.XENDIT_SECRET });

        ctx.response.status = 200;
        ctx.response.body = {
          data: "OK",
          resp: "Nice",
        };
      } catch (err) {
        ctx.body = err;
      }
    },
    async receivePayment(ctx) {
      try {
      } catch (error) {
        ctx.body = error;
      }
    },
  }));
});
