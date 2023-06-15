"use strict";

/**
 * participant controller
 */

const { createCoreController } = require("@strapi/strapi").factories;

module.exports = createCoreController(
  "api::participant.participant",
  ({ strapi }) => ({
    async sendRegistrationMail(ctx) {
      const { invoice_id } = ctx.request.body;

      console.log("invoice::::: ", invoice_id);
      try {
        await strapi
          .service("api::participant.participant")
          .sendRegistrationSuccessEmail(invoice_id);

        ctx.response.status = 200;
        ctx.response.body = true;
      } catch (error) {
        console.log("Error @ sending email: ", error);
        ctx.response.status = error.status;
        ctx.response.message = error.message;
        ctx.response.body = false;
      }
    },
    async getBibNumber(ctx) {
      const { categoryUid } = ctx.request.query;

      let bibNumber;
      try {
        bibNumber = await strapi
          .service("api::participant.participant")
          .createBibNumber(categoryUid);
      } catch (error) {
        console.log("Error @ get BIB number: ", JSON.parse(error));
        ctx.response.status = error.status;
        ctx.response.message = error.message;
        ctx.response.body = JSON.parse(error);
      }

      console.log("bib number buatan: ", bibNumber);

      ctx.response.status = 200;
      ctx.response.body = { bib: bibNumber };
    },
  })
);
