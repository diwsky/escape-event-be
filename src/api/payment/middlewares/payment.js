'use strict';

/**
 * `payment` middleware
 */

module.exports = (config, { strapi }) => {
  // Add your own logic here.
  return async (ctx, next) => {
    strapi.log.info('In payment middleware.');

    await next();
  };
};
