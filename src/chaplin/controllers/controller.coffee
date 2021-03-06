'use strict'

_ = require 'underscore'
Backbone = require 'backbone'
EventBroker = require 'chaplin/lib/event_broker'

module.exports = class Controller
  # Borrow the static extend method from Backbone.
  @extend = Backbone.Model.extend

  # Mixin Backbone events and EventBroker.
  _(@prototype).extend Backbone.Events
  _(@prototype).extend EventBroker

  view: null
  context : null

  # Internal flag which stores whether `redirectTo`
  # was called in the current action.
  redirected: false

  constructor: ->
    
  #  called by context
  initialize: ( context ) ->
    @context = context
  
  # override this method to provide containers for sub modules
  # must return an array of dom elements with the given length
  # @len : the number of regions needed
  # the default implementation return null, it mean that this controller
  # can't contain nested children
  createRegions: ( len ) ->
    return null

  # internal use
  # add dom content to the given parent element
  attach: ( el ) ->
    @view.attach( el ) if @view?

  # override this method to handle parameters grabbed
  # from url fragments
  parameters : ( p ) ->

  # Composer
  # --------

  # Convenience method to publish the `!composer:compose` event. See the
  # composer for information on parameters, etc.
  compose: (name, second, third) ->
    if arguments.length is 1
      # Retrieve an active composition using the retrieve event.
      item = null
      @publishEvent '!composer:retrieve', name, (composition) ->
        item = composition
      item
    else
      # Compose the arguments using the compose method.
      @publishEvent '!composer:compose', name, second, third

  # Redirection
  # -----------

  # Redirect to URL.
  redirectTo: (url, options = {}) ->
    @redirected = true
    @publishEvent '!router:route', url, options, (routed) ->
      unless routed
        throw new Error 'Controller#redirectTo: no route matched'

  # Redirect to named route.
  redirectToRoute: (name, params, options) ->
    @redirected = true
    @publishEvent '!router:routeByName', name, params, options, (routed) ->
      unless routed
        throw new Error 'Controller#redirectToRoute: no route matched'

  # Disposal
  # --------

  disposed: false

  dispose: ->
    return if @disposed

    # Dispose and delete all members which are disposable.
    for own prop, obj of this when obj and typeof obj.dispose is 'function'
      obj.dispose()
      delete this[prop]

    # Unbind handlers of global events.
    @unsubscribeAllEvents()

    # Unbind all referenced handlers.
    @stopListening()

    # Remove properties which are not disposable.
    properties = ['redirected']
    delete this[prop] for prop in properties

    # Finished.
    @disposed = true

    # You're frozen when your heart’s not open.
    Object.freeze? this
