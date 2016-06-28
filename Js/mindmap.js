//Script MindMap(add, edit, move,... Node)
function init() {	
	if (window.goSamples) goSamples();  // init for these samples -- you don't need to call this
	var $ = go.GraphObject.make;
					
	myDiagram = $(go.Diagram, "DiagramDiv", {
			// position the graph in the middle of the diagram
			initialContentAlignment: go.Spot.Center,  
			
			// Put the diagram contents at the top center of the viewport
			initialDocumentSpot: go.Spot.TopCenter,
			initialViewportSpot: go.Spot.TopCenter,
							
			// allow double-click in background to create a new node
			"clickCreatingTool.archetypeNodeData": { namenode: "New Idea", fill: "white", stroke: "blue", dir: "",  source: "", strokeWidth: ""},

			// have mouse wheel events zoom in and out instead of scroll up and down
			"toolManager.mouseWheelBehavior": go.ToolManager.WheelZoom,
			
			
			// when the user drags a node, also move/copy/delete the whole subtree starting with that node
			"undoManager.isEnabled": true			
		}
	);

	// when the document is modified, add a "*" to the title and enable the "Save" button
	myDiagram.addDiagramListener("Modified", function(e) {
			var button = document.getElementById("SaveButton");
			if (button) button.disabled = !myDiagram.isModified;
			var idx = document.title.indexOf("*");
			if (myDiagram.isModified) {
				if (idx < 0) document.title += "*";
			} else {
				if (idx >= 0) document.title = document.title.substr(0, idx);
			}
		}
	);
		
	var SPREADLINKS = true;
	
	// This converter is used by the Picture.
    function findHeadShot(key) {
		return "images/" + key + ".png";
    }	

	// a node consists of some text with a line shape underneath
	myDiagram.nodeTemplate = $(go.Node, "Auto", {
			selectionObjectName: "TEXT", 
			rotatable: true, 
			locationSpot: go.Spot.Center,
			resizable: true
		},
		
		new go.Binding("location", "loc", go.Point.parse).makeTwoWay(go.Point.stringify),
						
		$(go.Shape, "RoundedRectangle", {
				parameter1: 20, // the corner has a large radius
				name: "SHAPE", 
				fill: "green",
				strokeWidth: 2,
				stroke: "blue",
				
				portId: "", // this line shape is the port -- what links connect with
				
				fromLinkable: true,
				fromLinkableSelfNode: true, 
				fromLinkableDuplicates: true,
				toLinkableSelfNode: true, 
				toLinkableDuplicates: true,
				cursor: "pointer",
				toLinkable: true
			},
			//new go.Binding("fill", "isHighlighted", function(h) { return h ? "fill" : "#A7E7FC"; }).ofObject(),
			new go.Binding("fill", "fill").makeTwoWay(),
			new go.Binding("stroke", "stroke").makeTwoWay(),
			new go.Binding("strokeWidth", "strokeWidth").makeTwoWay()
		),
		
		
		$(go.Panel, "Horizontal",
			$(go.Picture, {
					name: 'Picture',
					desiredSize: new go.Size(39, 50),
					margin: new go.Margin(6, 8, 6, 10),
				},
			
				new go.Binding("source", "source", findHeadShot).makeTwoWay()
			),
			// define the panel wher
		  
			$(go.TextBlock, {
					name: "TEXTBLOCK",
					editable: true,
					font: "bold 18pt helvetica, bold arial, sans-serif"
				},
			
				// remember not only the text string but the scale and the font in the node data
				new go.Binding("text", "namenode").makeTwoWay(),
				new go.Binding("scale", "scale").makeTwoWay()
			)
		),
				
		$(go.Panel, {
				height: 15,
				alignment: go.Spot.Right
			},  // always this height, even if the TreeExpanderButton is not visible
				
			$("TreeExpanderButton")
		)
	);

				
	// selected nodes show a button for adding children
	myDiagram.nodeTemplate.selectionAdornmentTemplate = $(go.Adornment, "Spot",
		$(go.Panel, "Auto",
			$(go.Shape, {
					fill: null, 
					stroke: "blue",
					strokeWidth: 2 
				}
			),
			
			$(go.Placeholder)  // a Placeholder sizes itself to the selected Node
		),
					
		// the button to create a "next" node, at the top-right corner
		$("Button", {
				alignment: go.Spot.Right,
				alignmentFocus: go.Spot.Left,
				click: addNodeAndLink  // this function is defined below
			},
		
			$(go.Shape, "PlusLine", { 
					width: 10, 
					height: 10 
				}
			)
		), // end button
					
		$(go.Panel, "Horizontal",{
				alignment: go.Spot.Top, 
				alignmentFocus: go.Spot.Bottom 
			},
		
			$("Button", {
					click: editText,
				},  // defined below, to support editing the text of the node
			
				$(go.TextBlock, "T", {
						font: "bold 10pt sans-serif", 
						desiredSize: new go.Size(15, 15), 
						textAlign: "center" 
					}
				)
			),
		
			$("Button", {
					click: changeColor // defined below, to support changing the color of the node
				},  
							
				new go.Binding("ButtonBorder.fill", "color", nextColor),
				new go.Binding("_buttonFillOver", "color", nextColor),
				$(go.Shape, { 
						fill: null, stroke: null, desiredSize: new go.Size(15, 15),  
					}
				)
			),
						
			$("Button", { // drawLink is defined below, to support interactively drawing new links
					click: drawLink,  // click on Button and then click on target node
					actionMove: drawLink  // drag from Button to the target node
				},
				
				$(go.Shape, { 
						geometryString: "M0 0 L8 0 8 12 14 12 M12 10 L14 12 12 14" 
					}
				)
			)
		
		/*
		$("Button", {
				actionMove: dragNewNode,  // defined below, to support dragging from the button
				_dragData: { text: "a Node", color: "lightgray" },  // node data to copy
				click: clickNewNode  // defined below, to support a click on the button
            },
			
            $(go.Shape, { 
					geometryString: "M0 0 L3 0 3 10 6 10 x F1 M6 6 L14 6 14 14 6 14z", 
					fill: "gray" 
				}
			)
        )
		*/
		)
	);

	function editText(e, button) {
		var node = button.part.adornedPart;
		e.diagram.commandHandler.editTextBlock(node.findObject("TEXTBLOCK"));
	}


	// the context menu allows users to change the font size and weight,
	// and to perform a limited tree layout starting at that node
	myDiagram.nodeTemplate.contextMenu = $(go.Adornment, "Vertical",
		$("ContextMenuButton",
			$(go.TextBlock, "Bigger"), { 
				click: function(e, obj) {
					changeTextSize(obj, 1.3); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Smaller"), { 
				click: function(e, obj) { 
					changeTextSize(obj, 1/1.3); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Bold/Normal"), { 
				click: function(e, obj) { 
					toggleTextWeight(obj); 
				} 
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Layout"),{
				click: function(e, obj) {
					var adorn = obj.part;
					adorn.diagram.startTransaction("Subtree Layout");
					layoutTree(adorn.adornedPart);
					adorn.diagram.commitTransaction("Subtree Layout");
				}
			}
		),
					
		//Button Coppy_Node
		$("ContextMenuButton",
			$(go.TextBlock, "Copy"),{
				click: function(e, obj) {
					e.diagram.commandHandler.copySelection();
				}
			}
		),
					
		//Button paste_node
		$("ContextMenuButton",
			$(go.TextBlock, "Paste"),{
				click: function(e, obj) {
					e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint);
				}
			}
		),
					
		//Button Cut_Node
		$("ContextMenuButton",
			$(go.TextBlock, "Cut"),{
				click: function(e, obj) {
					 e.diagram.commandHandler.cutSelection();
				}
			}
		),
					
		//Button Delete
		$("ContextMenuButton",
			$(go.TextBlock, "Delete"),{
				click: function(e, obj) {
					 e.diagram.commandHandler.deleteSelection();  
				}
			}
		)
	);

	// a link is just a Bezier-curved line of the same color as the node to which it is connected
	myDiagram.linkTemplate = $(TaperedLink, go.Link.Bezier, (SPREADLINKS ? go.Link.None : go.Link.Orthogonal), 
		{
			fromEndSegmentLength: (SPREADLINKS ? 50 : 1),
			toEndSegmentLength: (SPREADLINKS ? 50 : 1),
				curve: go.Link.Bezier, 
				adjusting: go.Link.Stretch,
				reshapable: true, 
				relinkableFrom: true, 
				relinkableTo: true,
				toShortLength: 3
		},
		new go.Binding("curviness"),
		
		$(go.Shape,  // the link shape 
				{ 
					name: "SHAPELINK",
					stroke: null,
					strokeWidth: 0
				}
			),
			
		new go.Binding("fill", "fill").makeTwoWay()
	);

	// Select linkTemplate
	myDiagram.linkTemplate.selectionAdornmentTemplate = $(go.Adornment, "Spot",
		$(go.Panel, "Auto",
			$(go.Shape, { 
					fill: null,
					strokeWidth: 0
				}
			),
			$(go.Placeholder)  // a Placeholder sizes itself to the selected Node
		),
						
		$(go.Panel, "Horizontal",{
				alignment: go.Spot.Top, 
				alignmentFocus: go.Spot.Bottom 
			},
			
			$("Button", {
					click: changeColorLink // defined below, to support changing the color of the node
				},  
								
					new go.Binding("ButtonBorder.fill", "color", nextColor),
					new go.Binding("_buttonFillOver", "color", nextColor),
					$(go.Shape, {
						fill: null, stroke: null, desiredSize: new go.Size(10, 10),  
					}
				)
			)
		)
	);

	// the Diagram's context menu just displays commands for general functionality
	myDiagram.contextMenu = $(go.Adornment, "Vertical",
		$("ContextMenuButton",
			$(go.TextBlock, "Undo"),{ 
				click: function(e, obj) {
					e.diagram.commandHandler.undo(); 
				} 
			},
							
			new go.Binding("visible", "", function(o) {
				return o.diagram.commandHandler.canUndo(); 
			}).ofObject()
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Redo"),{ 
				click: function(e, obj) {
					e.diagram.commandHandler.redo(); 
				} 
			},
							
			new go.Binding("visible", "", function(o) {
				return o.diagram.commandHandler.canRedo(); 
			}).ofObject()
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Save"),{ 
				click: function(e, obj) {
					save(); 
				} 
			}
		),
							
		$("ContextMenuButton",
			$(go.TextBlock, "Load"),{
				click: function(e, obj) {
					load();
				}
			}
		),
						
		$("ContextMenuButton",
			$(go.TextBlock, "Paste"),{
				click: function(e, obj) {
					e.diagram.commandHandler.pasteSelection(e.diagram.lastInput.documentPoint);
				}
			},
			
			new go.Binding("visible", "", function(o) {
				return o.diagram.commandHandler.canPaste(); 
				}
			).ofObject()
		),
						
							
		$("ContextMenuButton",
			$(go.TextBlock, "Delete"),{
				click: function(e, obj) {
					e.diagram.commandHandler.deleteSelection(); 
				}
			}
		)
	);


	myDiagram.addDiagramListener("SelectionMoved", function(e) {
		var rootX = myDiagram.findNodeForKey(0).location.x;
		myDiagram.selection.each(function(node) {
			if (node.data.parent !== 0) {
				return; // Only consider nodes connected to the root
			}
								
			var nodeX = node.location.x;
			if (rootX < nodeX && node.data.dir !== "right") {
				node.data.dir = 'right';
				myDiagram.model.updateTargetBindings(node.data);
				layoutTree(node);
			} else if (rootX > nodeX && node.data.dir !== "left") {
				node.data.dir = 'left';
				myDiagram.model.updateTargetBindings(node.data);
				layoutTree(node);
			}
		});
	});

	

	// read in the predefined graph using the JSON format data held in the "mySavedModel" textarea
	load();
	
	// Overview
    myOverview =
     $(go.Overview, "myOverviewDiv",  // the HTML DIV element for the Overview 
		{ 
			observed: myDiagram, 
			contentAlignment: go.Spot.Center 
		}
	);   // tell it which Diagram to show and pan
	
	// support editing the properties of the selected person in HTML
    if (window.Inspector) {
		myInspector = new Inspector('myInspector', myDiagram, {
				properties: {
					'key': { readOnly: true },
					'loc': { readOnly: true },
					'parent': { readOnly: true },
					'fill': {show: Inspector.showIfPresent, type: 'color' },
					'stroke': {show: Inspector.showIfPresent, type: 'color' },
					'strokeWidth': {type: 'text'},
					'scale': {type: 'text'}
				}
			}
		);
	}
}


// change Color Link
function changeColorLink(e, button) {
	var node = button.part.adornedPart;
	var shape = node.findObject("SHAPELINK");
	if (shape === null) return;
	node.diagram.startTransaction("Change color");
	shape.fill = nextColor(shape.fill);
	var color = nextColor(shape.fill)
	button["_buttonFillNormal"] = color;  // update the button too
	button["_buttonFillOver"] = color;
	//button.mouseEnter(e, button, '');
	node.diagram.commitTransaction("Change color");
}

function TaperedLink() {
    go.Link.call(this);
}

go.Diagram.inherit(TaperedLink, go.Link);
  
  // produce a Geometry from the Link's route
  /** @override */
TaperedLink.prototype.makeGeometry = function() {
    // maybe use the standard geometry for this route, instead?
    var numpts = this.pointsCount;
    if (numpts < 4 || this.computeCurve() !== go.Link.Bezier) {
      return go.Link.prototype.makeGeometry.call(this);
    }

    var p0 = this.getPoint(0);
    var p1 = this.getPoint((numpts > 4) ? 2 : 1);
    var p2 = this.getPoint((numpts > 4) ? numpts - 3 : 2);
    var p3 = this.getPoint(numpts - 1);
    var fromHoriz = Math.abs(p0.y - p1.y) < Math.abs(p0.x - p1.x);
    var toHoriz = Math.abs(p2.y - p3.y) < Math.abs(p2.x - p3.x);

    var p0x = p0.x + (fromHoriz ? 0 : -4);
    var p0y = p0.y + (fromHoriz ? -4 : 0);
    var p1x = p1.x + (fromHoriz ? 0 : -3);
    var p1y = p1.y + (fromHoriz ? -3 : 0);
    var p2x = p2.x + (toHoriz ? 0 : -2);
    var p2y = p2.y + (toHoriz ? -2 : 0);
    var p3x = p3.x + (toHoriz ? 0 : -1);
    var p3y = p3.y + (toHoriz ? -1 : 0);

    var fig = new go.PathFigure(p0x, p0y, true);  // filled
    fig.add(new go.PathSegment(go.PathSegment.Bezier, p3x, p3y, p1x, p1y, p2x, p2y));

    p0x = p0.x + (fromHoriz ? 0 : 4);
    p0y = p0.y + (fromHoriz ? 4 : 0);
    p1x = p1.x + (fromHoriz ? 0 : 3);
    p1y = p1.y + (fromHoriz ? 3 : 0);
    p2x = p2.x + (toHoriz ? 0 : 2);
    p2y = p2.y + (toHoriz ? 2 : 0);
    p3x = p3.x + (toHoriz ? 0 : 1);
    p3y = p3.y + (toHoriz ? 1: 0);
    fig.add(new go.PathSegment(go.PathSegment.Line, p3x, p3y));
    fig.add(new go.PathSegment(go.PathSegment.Bezier, p0x, p0y, p2x, p2y, p1x, p1y).close());

    var geo = new go.Geometry();
    geo.add(fig);
    geo.normalize();
    return geo;
  }
			
// used by nextColor as the list of colors through which we rotate
var myColors = ["lightgray", "lightblue", "lightgreen", "yellow", "orange", "pink", "brown", "gold"];

// used by both the Button Binding and by the changeColor click function
function nextColor(c) {
	var idx = myColors.indexOf(c);
	if (idx < 0) return "lightgray";
	if (idx >= myColors.length-1) idx = 0;
	return myColors[idx+1];
}

function changeColor(e, button) {
	var node = button.part.adornedPart;
	var shape = node.findObject("SHAPE");
	if (shape === null) return;
	node.diagram.startTransaction("Change color");
	shape.fill = nextColor(shape.fill);
	var color = nextColor(shape.fill)
	button["_buttonFillNormal"] = color;  // update the button too
	button["_buttonFillOver"] = color;
	//button.mouseEnter(e, button, '');
	node.diagram.commitTransaction("Change color");
}
			
function drawLink(e, button) {
	var node = button.part.adornedPart;
	var tool = e.diagram.toolManager.linkingTool;
	tool.startObject = node.port;
	e.diagram.currentTool = tool;
	tool.doActivate();
}

// the Button.click event handler, called when the user clicks the "N" button
/*
    function clickNewNode(e, button) {
      var data = button._dragData;
      if (!data) return;
      e.diagram.startTransaction("Create Node and Link");
      var fromnode = button.part.adornedPart;
      var newnode = createNodeAndLink(button._dragData, fromnode);
      newnode.location = new go.Point(fromnode.location.x + 200, fromnode.location.y);
      e.diagram.commitTransaction("Create Node and Link");
    }
*/

// the Button.actionMove event handler, called when the user drags within the "N" button
/*
    function dragNewNode(e, button) {
      var tool = e.diagram.toolManager.draggingTool;
      if (tool.isBeyondDragSize()) {
        var data = button._dragData;
        if (!data) return;
        e.diagram.startTransaction("button drag");  // see doDeactivate, below
        var newnode = createNodeAndLink(data, button.part.adornedPart);
        newnode.location = e.diagram.lastInput.documentPoint;
        // don't commitTransaction here, but in tool.doDeactivate, after drag operation finished
        // set tool.currentPart to a selected movable Part and then activate the DraggingTool
        tool.currentPart = newnode;
        e.diagram.currentTool = tool;
        tool.doActivate();
      }
    }
*/


/*
	tool.doDeactivate = function() {
	// commit "button drag" transaction, if it is ongoing; see dragNewNode, above
		if (tool.diagram.undoManager.nestedTransactionNames.elt(0) === "button drag") {
			tool.diagram.commitTransaction();
		}
		
		go.DraggingTool.prototype.doDeactivate.call(tool);  // call the base method
	};*/
			

function spotConverter(dir, from) {
	if (dir === "left") {
		return (from ? go.Spot.Left : go.Spot.Right);
	} else {
		return (from ? go.Spot.Right : go.Spot.Left);
	}
}

function changeTextSize(obj, factor) {
	var adorn = obj.part;
	adorn.diagram.startTransaction("Change Text Size");
	var node = adorn.adornedPart;
	var tb = node.findObject("TEXTBLOCK");
	tb.scale *= factor;
	adorn.diagram.commitTransaction("Change Text Size");
}

function toggleTextWeight(obj) {
	var adorn = obj.part;
	adorn.diagram.startTransaction("Change Text Weight");
	var node = adorn.adornedPart;
	var tb = node.findObject("TEXTBLOCK");
	// assume "bold" is at the start of the font specifier
	var idx = tb.font.indexOf("bold");
	if (idx < 0) {
		tb.font = "bold 11pt helvetica" + tb.font;
	} else {
		tb.font = tb.font.substr(idx + 5);
	}
		adorn.diagram.commitTransaction("Change Text Weight");
}

function addNodeAndLink(e, obj) {
	var adorn = obj.part;
	var diagram = adorn.diagram;
	diagram.startTransaction("Add Node");
	var oldnode = adorn.adornedPart;
	var olddata = oldnode.data;
	var newdata = { namenode: "New Idea", fill: "white", stroke: "blue", strokeWidth: "", dir: olddata.dir, parent: olddata.key, source: ""};
	
	diagram.model.addNodeData(newdata);
	layoutTree(oldnode);
	diagram.commitTransaction("Add Node");
}

function layoutTree(node) {
	if (node.data.key === 0) { 
	
	// adding to the root?
	layoutAll();  // lay out everything
	} else {  // otherwise lay out only the subtree starting at this parent node
		var parts = node.findTreeParts();
		layoutAngle(parts, node.data.dir === "left" ? 180 : 0);
	}
}

function layoutAngle(parts, angle) {		
	var layout = go.GraphObject.make(go.TreeLayout, {
		angle: angle,
		arrangement: go.TreeLayout.ArrangementFixedRoots,
		nodeSpacing: 15,
		layerSpacing: 60 
	});
	layout.doLayout(parts);
}

function layoutAll() {
	var root = myDiagram.findNodeForKey(0);
	if (root === null) 
	{
		return;
	}	
	myDiagram.startTransaction("Layout");
				
	// split the nodes and links into two collections
	var rightward = new go.Set(go.Part);
	var leftward = new go.Set(go.Part);
	root.findLinksConnected().each(
		function(link) {
			var child = link.toNode;
			if (child.data.dir === "left") {
				leftward.add(root);  // the root node is in both collections
				leftward.add(link);
				leftward.addAll(child.findTreeParts());
			} else {
				rightward.add(root);  // the root node is in both collections
				rightward.add(link);
				rightward.addAll(child.findTreeParts());
			}
		}
	);
				
	// do one layout and then the other without moving the shared root node
	layoutAngle(rightward, 0);
	layoutAngle(leftward, 180);
	myDiagram.commitTransaction("Layout");
}

// Show the diagram's model in JSON format
function save() {
	document.getElementById("mySavedModel").value = myDiagram.model.toJson();
	myDiagram.isModified = false;
}

function load() {
	myDiagram.model = go.Model.fromJson(document.getElementById("mySavedModel").value);
}
		
			
function saveTextAsFile(){	
	var textToWrite = document.getElementById("mySavedModel").value;
	var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
	var fileNameToSaveAs = document.getElementById("inputFileNameToSaveAs").value;
	var downloadLink = document.createElement("a");
	downloadLink.download = fileNameToSaveAs;
	downloadLink.innerHTML = "Download File";
	
	if (window.webkitURL != null){
		// Chrome allows the link to be clicked
		// without actually adding it to the DOM.
		downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
	}else{
		// Firefox requires the link to be added to the DOM
		// before it can be clicked.
		downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
		downloadLink.onclick = destroyClickedElement;
		downloadLink.style.display = "none";
		document.body.appendChild(downloadLink);
	}

	downloadLink.click();
	save();
}

function destroyClickedElement(event){
	document.body.removeChild(event.target);
}
	
function loadFileAsText(){
	var fileToLoad = document.getElementById("fileToLoad").files[0];

	var fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) {
		var textFromFileLoaded = fileLoadedEvent.target.result;
		document.getElementById("mySavedModel").value = textFromFileLoaded;
	};
	fileReader.readAsText(fileToLoad, "UTF-8");
	load();
}
			
//Search node with name_node
function searchDiagram() {  // called by button
	var input = document.getElementById("mySearch");
	if (!input) return;
	input.focus();

	// create a case insensitive RegExp from what the user typed
	var regex = new RegExp(input.value, "i");

	myDiagram.startTransaction("highlight search");
	myDiagram.clearHighlighteds();

	// search four different data properties for the string, any of which may match for success
	if (input.value) {  // empty string only clears highlighteds collection
		var results = myDiagram.findNodesByExample({ namenode: regex });
		myDiagram.highlightCollection(results);
		// try to center the diagram at the first node that was found
		if (results.count > 0){
			myDiagram.centerRect(results.first().actualBounds);
		}
	}

	myDiagram.commitTransaction("highlight search");
}

$(document).ready(function(){
	$('#imgage_gallery').click(function(){
		$('#thumb').slideToggle('slow');
		$('#Hotkeys_Table').hide('slow');
	});
				
	$('li img').click(function(){
		var imgbg = $(this).attr('dir');
	//console.log(imgbg);
		$('#load').css({backgroundImage: "url("+imgbg+")"});	
							
		});
						
		$('#bgimage').click(function(){
			$('#thumb').hide();
			$('#Hotkeys_Table').hide('slow');
		});
						
		$('#DiagramDiv').click(function(){
			$('#thumb').hide('slow');
			$('#Hotkeys_Table').hide('slow');
		});
						
		$('#Keyboard_Shortcuts').click(function(){
			$('#Hotkeys_Table').slideToggle('slow');
			$('#thumb').hide('slow');
		});
	}
);

$(function() {
	$( "#menu" ).draggable({containment: '.mindMap', cursor: 'move', snap: '.mindMap'});
				
	$('#verborgen_file').hide();
	$('#uploadButton').on('click', function () {
		$('#verborgen_file').click();
	});

	$('#verborgen_file').change(function () {
		var file = this.files[0];
		var reader = new FileReader();
		reader.onloadend = function () {
			$('#load').css('background', 'url("' + reader.result + '")no-repeat center center fixed');
		}
		
		if (file) {
			reader.readAsDataURL(file);
		} else {}
	});
});

