
_ = require 'underscore'
Backbone = require 'backbone'
Model = require 'chaplin/models/model'
EventBroker = require 'chaplin/lib/event_broker'
Root = require 'chaplin/controllers/root'
ModelParser = require 'chaplin/models/html_model_parser'
$ = require 'jquery'
Batcher = require 'chaplin/lib/batcher'

# require 'pjax'

DATA_MODULE_ATTR        = "data-module"
DATA_MODELS_URL_ATTR    = "data-models-url"
DATA_MODEL_ATTR         = "data-model"
DATA_SELECTOR_ATTR      = "data-sel"

ROOT_NAME = "__root__"

unique = 0

class ModelLoader
    @extend = Backbone.Model.extend

    _(@prototype).extend Batcher.Loadable.prototype
    _(@prototype).extend Model.prototype

    context : null

    constructor : ( context ) ->
      @context = context

    execute : () ->
      options =
          url : @context.modelUrl
          dataType : 'text'

      @fetch options

    parse : ( html ) ->
      div = document.createElement 'div'
      div.innerHTML = html
      @context.node.appendChild div
      @context.modelParser.parseNode div
      @_sendComplete()
      return {}




class ComponentContext

    # Mixin an EventBroker.
    _(@prototype).extend EventBroker

    node : null

    modelUrl : null
    model : null
    parent : null
    children : null
    _byId : null
    controller : null
    params : null
    id : -1
    index : -1
    childsChanged : false
    modelParser : null


    constructor : ( @node, @name, @action ) ->
        console.log "ComponentContext #{@name} # #{@action}"
        @id = unique++
        @children = []
        @parent = null
        @modelUrl = null
        @_byId = {}
        @controller = null
        @params = null
        @index = -1
        @running  = false

        @childsChanged = true
        @modelParser = new ModelParser



    setModelUrl : ( url ) ->
        @modelUrl = url


    addChild : ( comp ) ->
        if( @_byId[ comp.id ] isnt undefined )
            throw "DomModel.ComponentContex#addChild subcontext '#{comp.name}' already exist in #{@path()}"
        @children.push comp
        comp.index = @_byId[ comp.id ] = @children.length-1
        comp.parent = @
        # invalidate comp struct

    removeChild : ( comp ) ->
        if( index = @_byId[ comp.id ] is undefined )
            throw "DomModel.ComponentContex#removeChild subcontext '#{comp.name}' doesn't exist in #{@path()}"
        @children.splice index, 1
        delete @_byId[ comp.id ]
        comp.parent = null
        # invalidate comp struct

    replaceBy : ( newone ) ->

        if @parent?
            @parent.replaceChild @, newone
            newone.parent = @parent
        else
            newone.copyChildsFrom @
        @parent = null

        @_dispose()

    replaceChild : ( child, newChild ) ->

        newChild.index = index = @_byId[ child.id ]
        @children.splice index, 1, newChild
        delete @_byId[ child.id ]
        @_byId[ newChild.id ] = index

        newChild.copyChildsFrom child
        # invalidate comp struct

    copyChildsFrom : ( other ) ->
        for child in @children
            child.parent = null
        @children = other.children
        other.children = []
        @_byId = {}
        for child, i in @children
            child.parent = @
            @_byId[child.id] = i



    fetchModel : () ->
        if @modelParser.isEmpty() and @modelUrl?
            return new ModelLoader @
        @model = @modelParser.getModel()
        return null



    # called by dispatcher when Controllers are all loaded
    # for the given skeleton
    # init create controller instance
    initialize : ( Controller ) ->
        console.log "ControllerContext#initialize #{@path()} # #{@action}"
        return if @controller?
        @controller = new Controller
        @controller.initialize this


    # called by dispatcher when all graph has been initialized
    executeAction : ->
        if @running
            console.log "ControllerContext#executeAction already running #{@path()}"
            return
        console.log "ControllerContext#executeAction #{@path()}: "+@action
        # Call the controller action with params and options.
        @model ?= @modelParser.getModel()

        @controller[@action] @model, @params
        @running = true

        #  request render in Layout
        @publishEvent 'component:render', @controller

    compose : ->
        @executeAction()
        return if @children.length is 0

        if @childsChanged
            regions = @controller.createRegions @children.length

        for child, i in @children
            child.compose()
            child.controller.attach regions[i] if @childsChanged

        @childsChanged = false


    getContainer : ->
        return @parent.controller.getRegion @index

    _dispose : () ->

        if @parent
            @parent.removeChild @

        for c in @children
            c.parent = null  if c.parent is @

        @children = null
        @modelUrl = null
        @modelIds = null
        @modelNodes = null
        @_byId = null

        if @controller
            @controller.dispose()
        @controller = null

    equal : (other ) ->
        @name       is other.name     and
        @modelUrl   is other.modelUrl and
        @action     is other.action

    # debug helper
    path : () ->
        str = @name
        p = this
        while p = p.parent
            str = p.name+"/"+str
        return str

    flatten : ( flat ) ->
        if flat?
            flat.push @
        else
            flat = [ @ ]
        for child in @children
            child.flatten flat
        flat


tagNameSelector = ( localName ) ->
    match : ( node ) ->
        node.localName is localName
    data : ( node ) ->
        node.innerText


# DomModel require pjax
# if not $.support.pjax
#     throw "DomModel require pjax"

module.exports = class DomModel extends Model

    @ComponentContext = ComponentContext

    rootCtx : null
    rootnode : null

    constructor : ( @rootnode )->
        @flatten = null
        @rootCtx = new ComponentContext null, ROOT_NAME, 'run'

        super


    initialize : ( ) ->
        super
        @rootCtx.initialize Root
        @parse()

    parse : ( htmlStr ) ->

        @trigger "parsing"
        console.log "DomModel#parse"

        if htmlStr?
            @rootnode.innerHTML = htmlStr

        tempRoot = new ComponentContext null, ROOT_NAME, 'run'

        @parseNodeAndDescendants @rootnode, tempRoot


        if not @makeDiff tempRoot
            @trigger "parsed"
            return @rootCtx

        # invalidate flatten view
        @flatten = null
        @flatten = @getFlatten()

        if @batcher?
            @batcher.off 'complete', @modelsLoaded

        @batcher = new Batcher
        for c in @flatten
            loadable = c.fetchModel()
            if loadable?
                @batcher.addLoadable loadable

        if @batcher.getLength() is 0
            @trigger "update"
            @trigger "parsed"
            return @rootCtx

        @batcher.on 'complete', @modelsLoaded
        @batcher.execute()

    modelsLoaded : =>
        @batcher.off 'complete', @modelsLoaded
        @batcher = null
        @trigger "update"
        @trigger "parsed"
    # return flat representation of components graph
    #  remove __root__ context from the result
    getFlatten : ->
        @flatten = @rootCtx.flatten()[1..]

    fetch : ( options ) ->

        console.log "DomModel#fetch"

        options ?= {}
        # we force 'text' type since we load html content
        options = _.defaults options,
            dataType : 'text'
        super options


    # compare old and new graph
    # recycle valids context from old graph
    # dispose other contexts
    # return true if struct has changed
    makeDiff : ( newRoot ) ->

        newFlat = newRoot.flatten()
        oldFlat = @rootCtx.flatten()

        if newFlat.length is oldFlat.length
            hasChanged = false

            # if flat list is identity
            # the tree is the same

            for newCtx, i in newFlat
                if not newCtx.equal oldFlat[i]
                    hasChanged = true
                    break

            if not hasChanged
                for newCtx in newFlat
                    newCtx._dispose()
                return false

        # children snapshot to compute child invalidation
        # after rearange the graph
        snapshot = []
        for newCtx, i in newFlat
            snapshot[i] = [].concat newCtx.children

        recycles = []


        for newCtx, i in newFlat
            for oldCtx, j in oldFlat
                if oldCtx.equal newCtx
                    oldFlat.splice j, 1
                    snapshot[i] = [].concat oldCtx.children
                    newCtx.replaceBy oldCtx
                    newFlat[i] = oldCtx
                    break
            # if dispose # already disposed by replaceBy
            #     newCtx.dispose()

        # push to current stales instead?
        if @stales?
            stale._dispose() for stale in @stales

        # store stales context to dispose them on futur
        # compose call
        @stales = oldFlat

        # compute children invalidation
        for newCtx, i in newFlat
            oldchildren = snapshot[i]
            children = newCtx.children
            if oldchildren.length isnt children.length
                newCtx.childsChanged = true
            else
                for c, i in children
                    if c isnt oldchildren[i]
                        newCtx.childsChanged = true
                        break

    # launch composition in context graph
    compose : ->
        if @stales?
            stale._dispose() for stale in @stales
        @stales = null

        @rootCtx.compose()

    parseNodeAndDescendants : ( node, context ) ->

        # if the node can't produce context
        # context is not changed
        context = @handleNode( node, context )


        currentChild = next = node.firstChild
        while currentChild = next
            next = currentChild.nextSibling
            @parseNodeAndDescendants currentChild, context


        context.modelParser.exitNode node




    handleNode : ( node, pcontext ) ->
        ctx = pcontext

        if @nodeHasDataStruct node, DATA_MODULE_ATTR
            ctx = @createContextFromNode node, ctx

#
#        if @nodeHasDataStruct node, DATA_MODEL_ATTR
#            mname = node.getAttribute DATA_MODEL_ATTR
#            ctx.addModelNode node, mname

        ctx.modelParser.enterNode node

        return ctx



    # return true if given node can provide data structure informations (name + selectors? + ...)
    # in order to create context
    nodeHasDataStruct : ( node, struct ) ->
        switch node.nodeType
            when 1 then return node.getAttribute( struct )?
            # when 8 then ... handle 'virtual nodes' (comments)
            else return false




    createContextFromNode : ( node, pcontext ) ->
        [comp_id, action] = node.getAttribute( DATA_MODULE_ATTR ).split '#'

        model_url = node.getAttribute DATA_MODELS_URL_ATTR


        ctx = new ComponentContext node, comp_id, action
        ctx.setModelUrl model_url
        pcontext.addChild ctx
        return ctx




