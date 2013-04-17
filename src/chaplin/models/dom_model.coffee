
_ = require 'underscore'
Backbone = require 'backbone'
Model = require 'chaplin/models/model'

DATA_MODULE_ATTR        = "data-module"
DATA_MODELS_URL_ATTR    = "data-models-url"
DATA_MODEL_ATTR         = "data-model"
DATA_SELECTOR_ATTR      = "data-sel"

ROOT_NAME = "__root__"


class Component

    constructor : ( @id ) ->
        @children = []
        @parent = null
        @modelUrl = null
        @modelIds = []
        @modelNodes = {}

    setModelUrl : ( url ) ->
        @modelUrl = url

    addModelNode :( node, name ) ->
        if @modelNodes[name]?
            throw "DomModel.Component a model '#{name}' already exist in #{@id}"
        @modelIds.push name
        @modelNodes[name] = node

    addChild : ( comp ) ->
        @children.push comp
        comp.parent = @

    # debug helper
    path : () ->
        str = @id
        p = this
        while p = p.parent
            str = p.id+"/"+str
        return str



tagNameSelector = ( localName ) ->
    match : ( node ) ->
        node.localName is localName
    data : ( node ) ->
        node.innerText


module.exports = class DomModel extends Model


    constructor : -> 
        @rootCtx = new Component ROOT_NAME
    
    initialize : () ->
        super
        set( 'root', null )

    parse : ( htmlStr ) ->
        console.log "TODO DomModel.parseHtmlString"


    parseNode : ( root ) -> 
        @parseNodeAndDescendants root, @rootCtx
        return @rootCtx

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
        comp_id = node.getAttribute DATA_MODULE_ATTR
        model_url = node.getAttribute DATA_MODELS_URL_ATTR
        
        ctx = new Component comp_id
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

