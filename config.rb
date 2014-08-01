set :css_dir, 'stylesheets'
set :js_dir, 'javascripts'
set :images_dir, 'images'

activate :directory_indexes

ignore /.*\.kate-swp/
ignore /.*\.ids/
ignore /.*\.draft\.md/
ignore 'stylesheets/all.styl'
ignore 'stylesheets/help-bg.styl'
ignore 'stylesheets/index.css.styl'
ignore 'stylesheets/help.css.styl'
ignore 'javascripts/jquery-1.11.1.min.js'
ignore 'javascripts/breath-tuner.js'

configure :development do
  # Reload the browser automatically whenever files change
  activate :livereload

  # Render pretty HTML
  Slim::Engine.set_default_options pretty: true, sort_attrs: false
end

configure :build do
end
