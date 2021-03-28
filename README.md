# Raid Map

I'd like for there to exist a system for delegating space in a collaborative SVG (or HTML document).

One of the main use cases I've been imagining is the [raid map](https://miro.com/app/board/o9J_knhEt7w=/?moveToViewport=-8516,-5516,21788,13742) where guilds, players, and projects all have representations on the map, and responsibility for customizing each's representation falls to the individual.

The workflow I imagine is a default layout is created with initial, perhaps generic, art in place for each of the participants. People are then able to claim spaces and have that approved by someone controlling a ancestor node of the requested node.

I want to define borders to spaces using clipping paths, so contributors are limited in the areas they can affect.

I want to store the document information in Ceramic. The requires some work b/c Ceramic's main document type is a Javascript-based structure. New software would need to be written to serialize the SVG documents to an IPFS IPLD structure and back. I've [begun working on it](https://github.com/dysbulic/xml-to-ipld).

The interface I'm envisioning is a file folderesque DOM tree on one side, and the rendered SVG on the other. When they hover (or long press) a node in the DOM, a bounding box is placed around it on the rendered image. Clicking or tapping brings up a UI for editing who is allowed to control that node and how is their image composed into the larger tableau.

Permissions are determined by walking the tree to the root and adding all the rules of each node along the way. This means controllers 
further up the tree are able to override permissions for all their descendants.

Eventually, I would like there to be the capacity for multiple parties to control competing versions of a given node, and for users to be able to browse between them. An AI could compose an ideal set of alternatives for a customized UI where the underlying semantic meanings stays the same.
