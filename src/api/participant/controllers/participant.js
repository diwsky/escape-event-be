"use strict";

/**
 * participant controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::participant.participant",
  ({ strapi }) => ({
    async sendRegistrationMail(ctx) {
      // const { sender, receiver } = ctx.request.body;
      // console.log("sender, receiver: ", sender, receiver);
      // await strapi.plugin("email").service("email").send({
      //   to: "escapenice.event@gmail.com",
      //   from: "escapenice.event@gmail.com",
      //   subject: "Test Subject Nice",
      //   html: "<b>Hello</b>",
      // });
      // test event vategory
      // const category_uid = "gtr-5-k";
      // strapi
      //   .service("api::category.category")
      //   .getEventAndCategoryName(category_uid);
      const invoice_id = "648918c2a9ad2f0c687f237d";

      try {
        await strapi
          .service("api::participant.participant")
          .sendRegistrationSuccessEmail(invoice_id);
      } catch (error) {
        console.log("Error @ sending email: ", error);
        ctx.response.status = error.status;
        ctx.response.message = error.message;
        ctx.response.body = JSON.parse(error);
      }
    },
  })
);
