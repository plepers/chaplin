
SiteTree = require './sitetree'

SEPARATOR = '/';
PARAM_SEP = '?';

module.exports = class Path

    # PUBLIC
    path        : null
    params      : null

    # PRIVATE
    _nodes      : null
    _segments   : null
    _valid		: false


    # @path     : String - fragment to parse
    # @params     : Object - get params
    constructor: ( path = '', params ) ->
        @solve( path )

        @params = params ? {}

    toNode : ->
        nodes = @toNodes()
        return null if not @_valid
        return nodes[ nodes.length-1 ]

    toNodes : ->
        @_nodes ?= @_solveNodes()
        return [].concat @_nodes

    segments : ->
        @_segments ?= @_buildSegments()

    solve: ( path ) ->
        [@path, @params] = path.split PARAM_SEP
        i=0
        l = @path.length
        while @path[i] is SEPARATOR and i < l
            i++
        l--
        return @path = '' if i is l
        j=l
        while @path[j] is SEPARATOR and j > -1
            j--
        if i > 0 or j isnt l
            @path = @path[ i..j ]

    
    _solveNodes : () ->
        segs = @segments()
        st = SiteTree.getInstance()
        current = st.rootNode
        ns = [ current ]
        valid = true
        for seg in segs
        	current = current.getChild seg
        	if current is null
        		valid = false
        		break
        	ns.push current
        @_valid = valid
        return ns

    _buildSegments : ->
        if @path is '' 
            return []
        @path.split SEPARATOR

    dispose : () ->
        @path = null
        @params = null
        @_nodes = null