module.exports = {
  routes: [
    {
      method: "POST",
      path: "/create_invoice",
      handler: "payment.createInvoice",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "GET",
      path: "/get_invoice/:id",
      handler: "payment.getInvoice",
      config: {
        policies: [],
        middlewares: [],
      },
    },
    {
      method: "POST",
      path: "/callback_invoice",
      handler: "payment.callbackInvoice",
      config: {
        policies: [],
        middlewares: [],
      },
    },
  ],
};
