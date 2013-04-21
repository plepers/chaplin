
_ = require 'underscore'
Backbone = require 'backbone'
Model = require 'chaplin/models/model'
Collection = require 'chaplin/models/collection'

DATA_ID_ATTR = "data-id"
DATA_LIST_ATTR = "data-list"
DATA_SELECTOR_ATTR = "data-sel"



mdl_set_options = 
    silent : true

modelsTemplates = {}

hasTemplate = ( ctx ) ->
    modelsTemplates[ ctx.node.tagName ]?

modelFactory = ( node, attributes ) ->
    return new Model(attributes) unless node?
    ModelClass = modelsTemplates[ node.tagName ]
    return if ModelClass?
        new ModelClass node, attributes
    new Model attributes

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
                model = modelFactory @node,
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
            model = modelFactory @node
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

    model : null
    rootCtx : null
    ctxStack : null

    constructor : -> 
        @rootCtx = new ModelContext( '__root__' )
        @ctxStack = [@rootCtx]

    parse : ( htmlStr ) ->
        console.log "TODO DomModel.parseHtmlString"


    parseNode : ( root ) -> 
        @parseNodeAndDescendants root, @rootCtx
        @buildModel @rootCtx

    isEmpty : ->
        @rootCtx.children.length is 0

    getModel : ->
        @model ?= @buildModel @rootCtx

    buildModel:  ( ctx ) ->
        # console.log (@rootCtx.debugLog())
        mdl = new Model
        ctx.createModel mdl
        # console.log( mdl )
        # TODO avoid useless root model creation
        return mdl.get( "__root__" )

    parseNodeAndDescendants : ( node ) ->

        # if the node can't product context 
        # context is not changed
        @enterNode node
        

        currentChild = next = node.firstChild
        while currentChild = next
            next = currentChild.nextSibling
            @parseNodeAndDescendants currentChild

        @exitNode node


    enterNode : ( node ) ->
        
        if @nodeHasDataStruct(node, DATA_ID_ATTR ) or @nodeHasDataStruct(node, DATA_LIST_ATTR)
            @ctxStack.unshift (@createContextFromNode node, @ctxStack[0])

        # else if @nodeMatchSelectors node, ctx.selectors

        if @nodeHasDataStruct node, DATA_SELECTOR_ATTR
            @addSelectorsFromNode node, @ctxStack[0]



    exitNode : ( node )->

        return if @ctxStack[0].node isnt node

        ctx = @ctxStack.shift()

        # if no data found in descendants
        # use defaults methods to grab datas in this node
        if ctx? and not ctx.hasComplexDatas() and not ctx.isCollection and not hasTemplate( ctx )
            ctx.setData( @getDefaultDatas node )



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
        ctx.node = node
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

# abstract class for model which
# grab attributes for nodes
class NodeModel extends Model
    n_attribs : [
#      "id",
#      "class",
#      "style",
      "accesskey",
      "contenteditable",
      "contextmenu",
      "dir",
      "draggable",
      "dropzone",
      "hidden",
      "lang",
      "spellcheck",
      "tabindex",
      "title",
      "translate" ]

    string : null
    attribs : null
    text : null

    constructor : (node, attributes) ->
        super attributes

        @attribs = []

        for attr in @n_attribs
          if node.hasAttribute attr
            val = node.getAttribute attr
            @set attr, val
            @attribs.push [ attr, val ]

        @text = node.innerText



class LinkModel extends NodeModel
    n_attribs : [
      'href',
      'hreflang',
      'media',
      'rel',
      'target',
      'type'
    ].concat NodeModel.prototype.n_attribs

    constructor : ( node, attributes) ->
        super node, attributes


    toString : ( params ) ->
      buf = '<a '
      for val in @attribs
        buf += val[0]+'="'+val[1]+'" '
      if params?
        buf += params

      buf += '>'+@text+'</a>'


modelsTemplates[ 'A'    ] = LinkModel