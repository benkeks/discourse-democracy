# frozen_string_literal: true

# name: DiscourseDemocracy
# about: Facilitate digital voting procedures in Discourse.
# version: 0.1
# authors: benkeks
# url: https://github.com/benkeks

register_asset 'stylesheets/common/discourse-democracy.scss'
register_asset 'stylesheets/desktop/discourse-democracy.scss', :desktop
register_asset 'stylesheets/mobile/discourse-democracy.scss', :mobile

enabled_site_setting :discourse_democracy_enabled

PLUGIN_NAME ||= 'DiscourseDemocracy'

load File.expand_path('lib/discourse-democracy/engine.rb', __dir__)

after_initialize do
  # https://github.com/discourse/discourse/blob/master/lib/plugin/instance.rb
end
