'use strict'

_ = require 'underscore'
Backbone = require 'backbone'
utils = require 'chaplin/lib/utils'
EventBroker = require 'chaplin/lib/event_broker'
CompositeController = require 'chaplin/controllers/composite'
DomModel = require 'chaplin/models/dom_model'

module.exports = class Dispatcher
  # Borrow the static extend method from Backbone.
  @extend = Backbone.Model.extend

  # Mixin an EventBroker.
  _(@prototype).extend EventBroker

  # The previous route information.
  # This object contains the controller name, action, path, and name (if any).
  previousRoute: null

  # The current controller, route information, and parameters.
  # The current route object contains the same information as previous.
  currentController: null
  currentRoute: null
  currentParams: null

  composite : null

  structure : null

  domModel : null

  constructor: ->
    @initialize arguments...

  initialize: (options = {}) ->
    # Merge the options.
    @settings = _(options).defaults
      controllerPath: 'controllers/'
      controllerSuffix: '_controller'

    # Listen to global events.
    @subscribeEvent 'router:match', @dispatch
    # @subscribeEvent 'router:matches', @matches
    @subscribeEvent 'router:fallback', @fallback

    if options['domModelContainer']
      dmc = options['domModelContainer']
    else
      dmc = document.createElement( 'div')
      dmc.id = "_skeleton"
      document.body.appendChild( dmc )

    @domModel = new DomModel dmc
    @domModel.on "update", @updateSkeleton
    @updateSkeleton()

  # testDomMdlLoading : () ->
  #   @domModel.fetch( { url : "newdom.html"} )


  updateSkeleton : =>
    console.log 'Dispatcher#updateSkeleton'
    contexts = @domModel.getFlatten()

    @loadControllers contexts, ( ctrls... ) =>
        # initalize all nodes graph first
        for ctx, i in contexts
          ctx.initialize ctrls[i]

        # execute graph actions
        ctx.executeAction() for ctx in contexts
          

        # compose page
        ctx.attach() for ctx in contexts
          



  # Controller management.
  # Starting and disposing controllers.
  # ----------------------------------

  # The standard flow is:
  #
  #   1. Test if it’s a new controller/action with new params
  #   1. Hide the previous view
  #   2. Dispose the previous controller
  #   3. Instantiate the new controller, call the controller action
  #   4. Show the new view
  #
  dispatch: (route, params, options) ->
    # Clone params and options so the original objects remain untouched.
    params = if params then _.clone(params) else {}
    options = if options then _.clone(options) else {}

    # Whether to update the URL after controller startup.
    # Default to true unless explicitly set to false.
    options.changeURL = true unless options.changeURL is false

    # Whether to force the controller startup even
    # if current and new controllers and params match
    # Default to false unless explicitly set to true.
    options.forceStartup = false unless options.forceStartup is true

    # Stop if the desired controller/action is already active
    # with the same params.
    return if not options.forceStartup and
      @currentRoute?.controller is route.controller and
      @currentRoute?.action is route.action and
      _.isEqual @currentParams, params

    # Fetch the new controller, then go on.
    @loadController route.controller, (Controller) =>
      @controllerLoaded route, params, options, Controller

  # matches : ( routes ) ->
  #   if( routes.length == 1 )
  #     match = routes[0]
  #     route =
  #       path : match.path
  #       action : match.action
  #       controller : match.controller
  #       name : match.name
  #       query : match.query

  #     @dispatch route , match.params, match.options

  #   else
  #     console.log "handle composite controller here :)"
  #     @loadControllers routes, ( ctrls... ) =>
  #       @composite ?= new CompositeController
  #       @composite.recompose ctrls, routes

  # no routes founds in history handlers
  # try to load new dom model
  fallback : ( fragment ) ->
    console.log "Dispatcher#fallback : #{fragment}"
    @domModel.fetch { url : "#{fragment}.html"}


  # load multiple controllers
  # need amd
  loadControllers: ( contexts, handler ) ->
    names = _.map contexts, ( ctx ) =>
      @settings.controllerPath + ctx.id + @settings.controllerSuffix
    if define?.amd
      require names, handler
    else
      throw new Error 'Dispatch#loadControllers need AMD'


  # Load the constructor for a given controller name.
  # The default implementation uses require() from a AMD module loader
  # like RequireJS to fetch the constructor.
  loadController: (name, handler) ->
    fileName = name + @settings.controllerSuffix
    moduleName = @settings.controllerPath + fileName
    if define?.amd
      require [moduleName], handler
    else
      handler require moduleName

  # Handler for the controller lazy-loading.
  controllerLoaded: (route, params, options, Controller) ->
    # Store the current route as the previous route.
    @previousRoute = @currentRoute

    # Setup the current route object.
    @currentRoute = _.extend {}, route, previous: utils.beget @previousRoute

    # Initialize the new controller.
    controller = new Controller params, @currentRoute, options

    # Execute before actions if necessary.
    methodName = if controller.beforeAction
      'executeBeforeActions'
    else
      'executeAction'
    this[methodName](controller, @currentRoute, params, options)

  
  # Change the URL to the new controller using the router.
  adjustURL: (route, params, options) ->
    return unless route.path?

    # Tell the router to actually change the current URL.
    url = route.path + if route.query then "?#{route.query}" else ""
    @publishEvent '!router:changeURL', url, options if options.changeURL

  # Disposal
  # --------

  disposed: false

  dispose: ->
    return if @disposed

    @unsubscribeAllEvents()

    @disposed = true

    # You’re frozen when your heart’s not open.
    Object.freeze? this
