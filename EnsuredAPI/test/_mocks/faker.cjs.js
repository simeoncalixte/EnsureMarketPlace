const faker = {
  company: {
    name: () => `Acme ${Math.random().toString(36).slice(2,6).toUpperCase()}`,
  },
  internet: {
    password: (opts) => {
      const len = (opts && opts.length) || 12;
      const raw = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
      return raw.slice(0, len).padEnd(len, 'x');
    },
    email: ({ firstName, lastName } = {}) => {
      const fn = (firstName || 'user').toString().replace(/\s+/g, '').toLowerCase();
      const ln = (lastName || 'test').toString().replace(/\s+/g, '').toLowerCase();
      return `${fn}.${ln}${Math.floor(Math.random()*1000)}@example.com`;
    },
  },
  person: {
    firstName: () => 'Test',
    lastName: () => 'User',
  },
};

module.exports = faker;
module.exports.default = faker;
