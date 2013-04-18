
_ = require 'underscore'
Backbone = require 'backbone'
Model = require 'chaplin/models/model'
EventBroker = require 'chaplin/lib/event_broker'
Root = require 'chaplin/controllers/root'
$ = require 'jquery'

# require 'pjax'

DATA_MODULE_ATTR        = "data-module"
DATA_MODELS_URL_ATTR    = "data-models-url"
DATA_MODEL_ATTR         = "data-model"
DATA_SELECTOR_ATTR      = "data-sel"

ROOT_NAME = "__root__"


class ComponentContext

    # Mixin an EventBroker.
    _(@prototype).extend EventBroker

    constructor : ( @id, @action ) ->
        console.log "new ComponentContext"+@id
        @children = []
        @parent = null
        @modelUrl = null
        @modelIds = []
        @modelNodes = {}
        @_byId = {}
        @controller = null
        @params = null
        @index = -1

        @childsChanged = true

    setModelUrl : ( url ) ->
        @modelUrl = url

    addModelNode :( node, name ) ->
        if @modelNodes[name]?
            throw "DomModel.ComponentContext a model '#{name}' already exist in #{@id}"
        @modelIds.push name
        @modelNodes[name] = node

    addChild : ( comp ) ->
        if( @_byId[ comp.id ] isnt undefined )
            throw "DomModel.ComponentContex#addChild subcontext '#{comp.id}' already exist in #{@id}"
        @children.push comp
        comp.index = @_byId[ comp.id ] = @children.length-1
        comp.parent = @
        # invalidate comp struct
        @childsChanged = true

    replaceBy : ( newone ) ->
        if @id isnt newone.id
            throw "DomModel.ComponentContext#replaceBy ids must be the same : '#{@id}' in #{newone.id}"

        if @parent?
            @parent.replaceChild @, newone
            newone.parent = @parent

        newone.copyChildsFrom @
        @dispose()

    replaceChild : ( child, newChild ) ->

        if @_byId[ child.id ] is undefined 
            throw "DomModel.ComponentContext#replaceChild child doesn't exist '#{child.id}' in #{@id}"
        if child.id isnt newChild.id
            throw "DomModel.ComponentContext#replaceChild pair have different ids '#{child.id}' in #{newChild.id}"

        newChild.index = index = @_byId[ child.id ]
        @children.splice index, 1, newChild 

        newChild.copyChildsFrom child
        # invalidate comp struct
        @childsChanged = true

    copyChildsFrom : ( other ) ->
        @children = other.children
        @_byId = other._byId
        for child in @children
            child.parent = @
        @childsChanged = true


    # called by dispatcher when Controllers are all loaded
    # for the given skeleton
    # init create controller instance
    initialize : ( Controller ) ->
        return if @controller
        @controller = new Controller
        @controller.initialize this

    # called by dispatcher when all graph has been initialized
    executeAction : ->
        # Call the controller action with params and options.
        @controller[@action] @params

        #  request render in Layout 
        @publishEvent 'component:render', @controller
            

    getContainer : ( child )->
        return @parent.controller.getRegion @index

    dispose : () ->
        @children = null
        @parent = null
        @modelUrl = null
        @modelIds = null
        @modelNodes = null
        @_byId = null

        if @controller
            @controller.dispose()
        @controller = null

    equal : (other ) ->
        @id         is other.id and 
        @modelUrl   is other.modelUrl and 
        @action     is other.action

    # debug helper
    path : () ->
        str = @id
        p = this
        while p = p.parent
            str = p.id+"/"+str
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

    constructor : ( rootnode )-> 
        @rootnode = rootnode
        @flatten = null
        @rootCtx = new ComponentContext ROOT_NAME, null
        
        super
        
    
    initialize : ( ) ->
        super
        @rootCtx.initialize Root
        @parse()

    parse : ( htmlStr ) ->

        console.log "DomModel#parse"

        if htmlStr?
            @rootnode.innerHTML = htmlStr
        
        tempRoot = new ComponentContext ROOT_NAME, null

        @parseNodeAndDescendants @rootnode, tempRoot


        if not @makeDiff tempRoot
            console.log "DomModel#parse no changes in structures"
            @trigger "parsed"
            return @rootCtx # = oldContexts
        
        # invalidate flatten view
        @flatten = null     
        @trigger "update"
        @trigger "parsed"
        return @rootCtx

    # return flat representation of components graph
    #  remove __root__ context from the result
    getFlatten : ->
        @flatten ?= @rootCtx.flatten()[1..]

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
                    newCtx.dispose()
                return false


        recycles = []

        for newCtx in newFlat
            dispose = false
            for oldCtx, j in oldFlat
                if oldCtx.equal newCtx
                    oldFlat.splice j, 1
                    newCtx.replaceBy oldCtx
                    dispose = true
                    break
            # if dispose # already disposed by replaceBy
            #     newCtx.dispose()

        for oldCtx in oldFlat
            oldCtx.dispose()
        

          
        

    parseNodeAndDescendants : ( node, context ) ->
        # DEBUG
        if not context?
            throw "aie"
        # DEBUG

        # if the node can't produce context 
        # context is not changed
        context = @handleNode( node, context )
        

        currentChild = next = node.firstChild
        while currentChild = next
            next = currentChild.nextSibling
            @parseNodeAndDescendants currentChild, context


       



    handleNode : ( node, pcontext ) ->
        ctx = pcontext

        if @nodeHasDataStruct node, DATA_MODULE_ATTR 
            ctx = @createContextFromNode node, ctx




        if @nodeHasDataStruct node, DATA_MODEL_ATTR
            mname = node.getAttribute DATA_MODEL_ATTR
            ctx.addModelNode node, mname

        return ctx



    # return true if given node can provide data structure informations (name + selectors? + ...)
    # in order to create context
    nodeHasDataStruct : ( node, struct ) ->
        switch node.nodeType
            when 1 then return node.getAttribute( struct )?
            # when 8 then ... handle 'virtual nodes' (comments)
            else return false



    # return true if the given node match one of parent's selectors
    nodeMatchSelectors : ( node, selectors ) ->
        for selector in selectors
            if selector.match node
                return true
        return false



    createContextFromNode : ( node, pcontext ) ->
        [comp_id, action] = node.getAttribute( DATA_MODULE_ATTR ).split '#'

        model_url = node.getAttribute DATA_MODELS_URL_ATTR
        

        ctx = new ComponentContext comp_id, action
        ctx.setModelUrl model_url
        pcontext.addChild ctx
        return ctx



    addSelectorsFromNode : ( node, ctx ) ->
        selsPattern = node.getAttribute DATA_SELECTOR_ATTR
        ctx.selectors ?= []
        sels = ctx.selectors
        # for now just support tagname selector
        names = selsPattern.split ","
        for name in names
            sels.push( tagNameSelector name )
        return



    getDefaultDatas : ( node ) ->
        # for now simply return inner text
        node.innerText

