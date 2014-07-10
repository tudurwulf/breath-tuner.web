###
# Compass
###

# Change Compass configuration
# compass_config do |config|
#   config.output_style = :compact
# end

###
# Page options, layouts, aliases and proxies
###

# Per-page layout changes:
#
# With no layout
# page "/path/to/file.html", :layout => false
#
# With alternative layout
# page "/path/to/file.html", :layout => :otherlayout
#
# A path which all have the same layout
# with_layout :admin do
#   page "/admin/*"
# end

# Proxy pages (http://middlemanapp.com/basics/dynamic-pages/)
# proxy "/this-page-has-no-template.html", "/template-file.html", :locals => {
#  :which_fake_page => "Rendering a fake page with a local variable" }

# Automatic image dimensions on image_tag helper
# activate :automatic_image_sizes

activate :directory_indexes

ignore /.*\.kate-swp/
ignore /.*\.ids/
ignore 'stylesheets/all.styl'
ignore 'stylesheets/help-bg.styl'

set :css_dir, 'stylesheets'
set :js_dir, 'javascripts'
set :images_dir, 'images'

Slim::Engine.set_default_options pretty: true, sort_attrs: false

# Reload the browser automatically whenever files change
configure :development do
  activate :livereload
end

# Build-specific configuration
configure :build do
  activate :relative_assets
  activate :asset_hash

  # Set an HTTP prefix in case of deploying to a nested directory
  # Remember to disable relative assets
  # set :http_prefix, '/apps/breath-tuner/'

#   activate :minify_html,
#     :remove_intertag_spaces => true,
#     :remove_http_protocol => false
#   activate :minify_css
#   activate :minify_javascript
end
