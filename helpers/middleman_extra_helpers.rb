module MiddlemanExtraHelpers
  # Marks a link as current if it points to the current URL. By default, it adds
  # the class `current`.
  #
  # Options:
  #   :current_class    Name of class that the element will be bestowed with.
  #                     Default: current.
  #   :match_subdirs    Marks the link as current also if the current page URL
  #                     is its descendant. For example: if the link's URL is
  #                     `/articles/` and `current_page.url` is
  #                     `/articles/title/`. Default: false.
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
  # TODO stylesheet_link_tag(*sources, options = {})
  def stylesheet basename
    if build?
      content_tag :style do
        # Requires `.chomp` for proper minification
        sprockets[ "#{basename}.css" ].to_s.chomp
      end
    else
      stylesheet_link_tag basename
    end
  end

  # Renders a javascript asset within <script> tags
  # TODO javascript_include_tag(*sources, options = {})
  def javascript basename
    if build?
      content_tag :script do
        # Requires `.chomp` for proper minification
        sprockets[ "#{basename}.js" ].to_s.chomp
      end
    else
      javascript_include_tag basename
    end
  end
end
