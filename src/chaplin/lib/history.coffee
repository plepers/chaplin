'use strict'


EventBroker  = require 'chaplin/lib/event_broker'
Backbone 	   = require 'backbone'
_			       = require 'underscore'

module.exports = class History extends Backbone.History
  # Mixin an EventBroker.
  _(@prototype).extend EventBroker

  # filter handlers that match the fragment and return map
  # of the callbacks ( @see Route.handler )
  loadUrl : (fragmentOverride) ->
    
    fragment = @fragment = @getFragment fragmentOverride

    # debug
    # for now always prevent links
    # and try to load new dom model
    @publishEvent 'router:fallback', fragment
    return true
    

    matched = _.filter @handlers, ( handler ) ->
      return handler.route.test fragment

    matched = _.map matched, ( handler ) ->
      return handler.callback fragment

    if matched.length > 0
      @publishEvent 'router:matches', matched
      return true

    @publishEvent 'router:fallback', fragment
    false