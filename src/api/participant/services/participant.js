"use strict";

/**
 * participant service
 */

const { createCoreService } = require("@strapi/strapi").factories;

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
  })
);
