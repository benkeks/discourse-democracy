import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("DiscourseDemocracy", { loggedIn: true });

test("DiscourseDemocracy works", async assert => {
  await visit("/admin/plugins/discourse-democracy");

  assert.ok(false, "it shows the DiscourseDemocracy button");
});
