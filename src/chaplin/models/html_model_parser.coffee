
_ = require 'underscore'
Backbone = require 'backbone'
Model = require 'chaplin/models/model'
Collection = require 'chaplin/models/collection'

DATA_ID_ATTR = "data-id"
DATA_LIST_ATTR = "data-list"
DATA_SELECTOR_ATTR = "data-sel"

mdl_set_options = 
    silent : true

class ModelContext

    constructor : ( @id , isCollection ) ->
        @attributes = {}
        @children = []
        @data = null
        @selector = []
        @isCollection = isCollection is true

    createModel : ( parent ) ->

        if @isSimpleData()
            if @parent.isCollection
                model = new Model
                    id : @id
                    cid : @id
                    value : @data
                parent.set model
            else
                parent.set @id, @data, mdl_set_options

        else if @isCollection
            model = new Collection()
            for cid in @children
                @attributes[cid].createModel model
            parent.set @id, model, mdl_set_options

        else
            model = new Model()
            for cid in @children
                @attributes[cid].createModel model

            parent.set @id, model, mdl_set_options




    isSimpleData : () ->
        @children.length is 0 and @data?

    hasComplexDatas : () ->
        @children.length isnt 0

    setData : ( data ) ->
        @data = data

    addChild : ( childContext ) ->
        cid = childContext.id
        if @attributes[cid]?
            throw "ModelContext#addChild  member redefinition #{cid} in "+@path()
        
        @children.push cid
        @attributes[cid] = childContext

        childContext.parent = @

    debugLog : ( tab, str ) ->
        str ?= ''
        tab ?= "   "

        str += "#{tab}Ctx #{@id} ########\n"

        tab += '   '

        if @isSimpleData()
            str += "#{tab}data :  #{@data} \n"
        for cid in @children

            child = @attributes[cid]

            if( child instanceof Array )
                str += "#{tab}#{cid} : Collection \n"
                for ctxItem in child
                    str = ctxItem.debugLog tab, str
            else
                str += "#{tab}#{cid} : Item \n"
                str = child.debugLog tab, str
        
        
        return str

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


module.exports = class HtmlModelParser

    constructor : -> 
        @rootCtx = new ModelContext( '__root__' )

    parse : ( htmlStr ) ->
        console.log "TODO DomModel.parseHtmlString"


    parseNode : ( root ) -> 
        @parseNodeAndDescendants root, @rootCtx
        @buildModel @rootCtx

    buildModel:  ( ctx ) ->
        # console.log (@rootCtx.debugLog())
        mdl = new Model
        ctx.createModel mdl
        # console.log( mdl )
        # TODO avoid useless root model creation
        return mdl.get( "__root__" )

    parseNodeAndDescendants : ( node, context ) ->
        # DEBUG
        if not context?
            throw "aie"
        # DEBUG

        # if the node can't product context 
        # context is not changed
        context = @handleNode( node, context )
        

        currentChild = next = node.firstChild
        while currentChild = next
            next = currentChild.nextSibling
            @parseNodeAndDescendants currentChild, context

        # if no data found in descendants
        # use defaults methods to grab datas in this node
        if not context.hasComplexDatas() and not context.isCollection
            context.setData( @getDefaultDatas node )



    handleNode : ( node, pcontext ) ->
        ctx = pcontext

        if @nodeHasDataStruct(node, DATA_ID_ATTR ) or @nodeHasDataStruct(node, DATA_LIST_ATTR)
            ctx = @createContextFromNode node, ctx


        # else if @nodeMatchSelectors node, ctx.selectors


        if @nodeHasDataStruct node, DATA_SELECTOR_ATTR
            @addSelectorsFromNode node, ctx

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
        dataName = node.getAttribute DATA_ID_ATTR
        isList = false
        if !dataName? 
            dataName = node.getAttribute DATA_LIST_ATTR
            isList = true
        ctx = new ModelContext dataName, isList
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

