module MiddlemanExtraHelpers
  # Adds class "current" if link points to current URL
  def tab_link_to link, url, opts = {}
    current_class = opts.delete(:current_class) || 'current'
    match_subdirs = opts.delete(:match_subdirs) || false
    tab_url = url_for(url)
    if  (not match_subdirs and current_page.url == tab_url) or
        (    match_subdirs and current_page.url =~ /^#{tab_url}/)
      opts[:class] = (opts[:class].to_s << " #{current_class}").lstrip
    end
    link_to link, url, opts
  end

  # Renders a stylesheet asset within <style> tags
  # TODO Do not inline js in dev mode
  def stylesheet basename
    content_tag :style do
      # Requires `.chomp` for proper minification
      sprockets[ "#{basename}.css" ].to_s.chomp
    end
  end

  # Renders a javascript asset within <script> tags
  # TODO Do not inline js in dev mode
  def javascript basename
    content_tag :script do
      # Requires `.chomp` for proper minification
      sprockets[ "#{basename}.js" ].to_s.chomp
    end
  end
end
