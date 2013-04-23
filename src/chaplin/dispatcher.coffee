'use strict'

_ = require 'underscore'
Backbone = require 'backbone'
utils = require 'chaplin/lib/utils'
EventBroker = require 'chaplin/lib/event_broker'
CompositeController = require 'chaplin/controllers/composite'
DomModel = require 'chaplin/models/dom_model'


class ComponentsLoader

  @extend = Backbone.Model.extend

  # Mixin Backbone events and EventBroker.
  _(@prototype).extend Backbone.Events

  disposed : false
  contexts : null
  settings : null

  constructor : ( @settings ) ->


  dispose : ->
    @contexts = null
    @disposed = true
    @settings = null
    @off null, null, null

  load : ( contexts ) ->
    @contexts = contexts
    names = _.map contexts, ( ctx ) =>
      @settings.controllerPath + ctx.name + @settings.controllerSuffix
    if define?.amd
      require names, @complete
    else
      throw new Error 'Dispatch#loadControllers need AMD'

  complete : ( components... ) =>
    return if @disposed

    @trigger "complete", @contexts, components


  mapper : ( ctx ) ->
    @settings.controllerPath + ctx.name + @settings.controllerSuffix



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
  loader : null

  constructor: ->
    @initialize arguments...

  initialize: (options = {}) ->
    # Merge the options.
    @settings = _(options).defaults
      controllerPath: 'controllers/'
      controllerSuffix: '_controller'

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
    @domModel.on "parsing", @skeletonParsing
    @updateSkeleton()

  # testDomMdlLoading : () ->
  #   @domModel.fetch( { url : "newdom.html"} )


  updateSkeleton : =>
    console.log 'Dispatcher#updateSkeleton'
    contexts = @domModel.getFlatten()

    @loadControllers contexts

  skeletonParsing : =>
    @loader.dispose() if @loader?
    @loader = null

  controllersLoaded : ( contexts, controlers ) ->
    for ctx, i in contexts
      ctx.initialize controlers[i]

    @domModel.compose()
    # execute graph actions


  # no routes founds in history handlers
  # try to load new dom model
  fallback : ( fragment ) ->
    console.log "Dispatcher#fallback : #{fragment}"
    url = fragment+".html"
    if url[0] isnt "/"
      url = '/'+url
    @domModel.fetch { url : url }


  # load multiple controllers
  # need amd
  loadControllers: ( contexts, handler ) ->

    @loader.dispose() if @loader?

    @loader = new ComponentsLoader @settings
    @loader.on 'complete', @controllersLoaded, this
    @loader.load contexts



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
