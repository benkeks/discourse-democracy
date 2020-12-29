export default {
  resource: 'user',
  map() {
    this.route('delegations', { path: '/delegations', resetNamespace: true });
  }
};