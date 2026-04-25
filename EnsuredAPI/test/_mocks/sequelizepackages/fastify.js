exports.buildRoutes = function buildRoutes(sequelize, opts = {}) {
  const prefix = opts.prefix || '';
  const routes = [];
  const models = (sequelize && sequelize.models) || {};

  for (const name of Object.keys(models)) {
    const model = models[name];
    const base = `${prefix}/${name}s`;

    // List
    routes.push({
      method: 'GET',
      url: base,
      schema: {},
      handler: async (_req) => ({ statusCode: 200, body: await model.findAll() }),
    });

    // Create
    routes.push({
      method: 'POST',
      url: base,
      schema: {},
      handler: async (req) => {
        const created = await model.create(req.body || {});
        const body = created && typeof created.get === 'function' ? created.get({ plain: true }) : created;
        return { statusCode: 201, body };
      },
    });

    // Read one
    routes.push({
      method: 'GET',
      url: `${base}/:id`,
      schema: {},
      handler: async (req) => {
        const id = req.params?.id;
        const found = await model.findByPk(id);
        if (!found) return { statusCode: 404, body: null };
        const body = typeof found.get === 'function' ? found.get({ plain: true }) : found;
        return { statusCode: 200, body };
      },
    });

    // Replace (PUT)
    routes.push({
      method: 'PUT',
      url: `${base}/:id`,
      schema: {},
      handler: async (req) => {
        const id = req.params?.id;
        const instance = await model.findByPk(id);
        if (!instance) return { statusCode: 404, body: null };
        await instance.update(req.body || {});
        const body = typeof instance.get === 'function' ? instance.get({ plain: true }) : instance;
        return { statusCode: 200, body };
      },
    });

    // Patch (PATCH)
    routes.push({
      method: 'PATCH',
      url: `${base}/:id`,
      schema: {},
      handler: async (req) => {
        const id = req.params?.id;
        const instance = await model.findByPk(id);
        if (!instance) return { statusCode: 404, body: null };
        await instance.update(req.body || {});
        const body = typeof instance.get === 'function' ? instance.get({ plain: true }) : instance;
        return { statusCode: 200, body };
      },
    });

    // Delete
    routes.push({
      method: 'DELETE',
      url: `${base}/:id`,
      schema: {},
      handler: async (req) => {
        const id = req.params?.id;
        const instance = await model.findByPk(id);
        if (!instance) return { statusCode: 404, body: null };
        await instance.destroy();
        return { statusCode: 204, body: undefined };
      },
    });
  }

  return routes;
};
