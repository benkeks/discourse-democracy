export default function() {
  this.route("discourse-democracy", function() {
    this.route("actions", function() {
      this.route("show", { path: "/:id" });
    });
  });
};
