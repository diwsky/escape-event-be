"use strict";

/**
 * category service
 */

const { createCoreService } = require("@strapi/strapi").factories;

module.exports = createCoreService("api::category.category", ({ strapi }) => ({
  async getEventAndCategoryName(categoryUid) {
    const result = await strapi.entityService.findMany(
      "api::category.category",
      {
        filters: {
          uid: categoryUid,
        },
        fields: ["name"],
        populate: {
          event: {
            fields: ["name"],
          },
        },
      }
    );

    if (result.length < 1) {
      throw {
        status: 404,
        message: "Category UID not valid!",
      };
    }

    const {
      name: categoryName,
      event: { name: eventName },
    } = result[0];

    return { eventName, categoryName };
  },
}));
