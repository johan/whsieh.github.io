// Miscellaneous utility functions.
let stringByInsertingStringAtIndex = (stringToInsert, index, fullString) => fullString.substring(0, index) + stringToInsert + fullString.substring(index);
let lower = (s) => s ? s.toLowerCase() : null;

// Global state.
let markdownOutputUpdateDelay = 500;
var inputEventsEnabled = true;
var updateMarkdownOutputTaskID = 0;
var lastMarkdownOutputUpdateTime = 0;
var isOutputAreaExpanded = true;

function load() {
    editor.addEventListener("beforeinput", handleBeforeInput);
    toggle.addEventListener("click", toggleInputEventOverrides);
    outputToggle.addEventListener("click", toggleOutputArea);
    editor.focus();

    updateMarkdownOutput();
}

function toggleOutputArea() {
    if (isOutputAreaExpanded) {
        editor.style.height = "calc(100% - 155px)";
        output.style.height = "0px";
        output.style.paddingTop = "0px";
        output.style.paddingBottom = "0px";
        output.style.color = "white";
        output.style.marginTop = "55px";
        editorLabel.style.top = "calc(100% - 145px)";
        outputToggle.innerHTML = "<code>+ OUTPUT</code>"
    } else {
        editor.style.height = "calc(50% - 100px)";
        output.style.height = "calc(50% - 125px)";
        output.style.paddingTop = "50px";
        output.style.paddingBottom = "50px";
        output.style.color = "black";
        output.style.marginTop = "25px";
        editorLabel.style.top = "calc(50% - 40px)";
        outputToggle.innerHTML = "<code>- OUTPUT</code>"
    }
    isOutputAreaExpanded = !isOutputAreaExpanded;
}

function handleBeforeInput(event) {
    scheduleMarkdownOutputUpdate();
    if (!inputEventsEnabled)
        return;

    var shouldPreventDefault = false;
    if (event.inputType === "formatBold") {
        surroundSelectionWithString("**")
        shouldPreventDefault = true;
    }

    if (event.inputType === "formatItalic") {
        surroundSelectionWithString("*");
        shouldPreventDefault = true;
    }

    if (event.inputType === "formatUnderline") {
        surroundSelectionWithString("_");
        shouldPreventDefault = true;
    }

    if (event.inputType === "formatJustifyLeft" || event.inputType === "formatJustifyCenter" || event.inputType === "formatJustifyRight") {
        // It doesn't make sense to align markdown content to the left/center/right.
        shouldPreventDefault = true;
    }

    if (event.inputType === "insertOrderedList") {
        // FIXME: We should inspect the selection here and insert "2.", "3.", etc. if the selection already succeeds an
        // ordered list item.
        prependTextAtSelection((i) => (i + 1) + ". ");
        shouldPreventDefault = true;
    }

    if (event.inputType === "insertUnorderedList") {
        prependTextAtSelection((i) => "- ");
        shouldPreventDefault = true;
    }

    if (event.inputType === "insertFromPaste" || event.inputType == "insertFromDrop") {
        let shouldSelectAll = event.inputType == "insertFromDrop";
        let htmlText = event.dataTransfer.getData("text/html");
        if (shouldHTMLTextBeInsertedAsUnorderedList(htmlText))
            insertMarkdownListWithLinePrefix(htmlText, shouldSelectAll, (i) => "- ");
        else if (shouldHTMLTextBeInsertedAsOrderedList(htmlText))
            insertMarkdownListWithLinePrefix(htmlText, shouldSelectAll, (i) => `${i + 1}. `);
        else {
            let surroundingText = "";
            if (shouldHTMLTextBeBolded(htmlText))
                surroundingText = "**";
            else if (shouldHTMLTextBeItalicized(htmlText))
                surroundingText = "*";
            else if (shouldHTMLTextBeUnderlined(htmlText))
                surroundingText = "_";
            insertTextAtSelection(`${surroundingText}${event.dataTransfer.getData("text/plain")}${surroundingText}`, shouldSelectAll);
        }
        shouldPreventDefault = true;
    }

    if (event.inputType === "deleteContentBackward")
        shouldPreventDefault = tryToPerformSmartDelete(event.getTargetRanges()[0]);

    if (event.inputType === "insertParagraph")
        shouldPreventDefault = tryToPerformSmartNewline();

    if (shouldPreventDefault) {
        flashMessage(`Intercepted "${event.inputType}"`, "#00C853");
        event.preventDefault();
    }
}

function flashMessage(message, color) {
    let div = document.createElement("div");
    let code = document.createElement("code");
    code.textContent = message;
    div.appendChild(code);
    div.style.color = color;
    div.classList.add("flash");
    div.addEventListener("transitionend", function() {
        div.remove();
    });
    setTimeout(function() {
        div.classList.add("flash-begin");
    }, 100);

    document.body.appendChild(div);
}

function tryToPerformSmartNewline() {
    let range = getSelection().getRangeAt(0)
        , start = range.startContainer
        , end = range.endContainer;

    if (start != end)
        return false;

    var prefixToInsert = null;
    if (start.textContent.indexOf("-") == 0)
        prefixToInsert = "-\u00A0";
    else {
        let searchResult = start.textContent.match(/^([0-9]+)\./);
        if (searchResult && searchResult.length > 1)
             prefixToInsert = `${parseInt(searchResult[1]) + 1}.\u00A0`;
    }

    if (!prefixToInsert)
        return false;

    getSelection().deleteFromDocument();
    let div = document.createElement("div");
    let text = document.createTextNode(prefixToInsert);
    div.appendChild(text);
    range.insertNode(div);

    getSelection().removeAllRanges();
    let newRange = document.createRange();
    newRange.setStart(text, text.textContent.length);
    newRange.setEnd(text, text.textContent.length);
    getSelection().addRange(newRange);
    return true;
}

function shouldHTMLTextBeBolded(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    // For now, mark the entire text as bold only if all parts of it are bold.
    for (var i = 0; i < div.childElementCount; i++) {
        let child = div.children[i];
        if (lower(child.style.fontWeight) !== "bold" && lower(getComputedStyle(child).fontWeight) !== "bold" && lower(child.tagName) !== "b") {
            if (!child.childElementCount || !shouldHTMLTextBeBolded(child.innerHTML))
                return false;
        }
    }
    return !!div.childElementCount;
}

function shouldHTMLTextBeItalicized(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    // For now, mark the entire text as bold only if all parts of it are bold.
    for (var i = 0; i < div.childElementCount; i++) {
        let child = div.children[i];
        if (lower(child.tagName) !== "i") {
            if (!child.childElementCount || !shouldHTMLTextBeItalicized(child.innerHTML))
                return false;
        }
    }
    return !!div.childElementCount;
}

function shouldHTMLTextBeUnderlined(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    // For now, mark the entire text as bold only if all parts of it are bold.
    for (var i = 0; i < div.childElementCount; i++) {
        let child = div.children[i];
        if (lower(child.tagName) !== "u" && lower(child.style.textDecoration) !== "underline") {
            if (!child.childElementCount || !shouldHTMLTextBeUnderlined(child.innerHTML))
                    return false;
        }
    }
    return !!div.childElementCount;
}

function shouldHTMLTextBeInsertedAsUnorderedList(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    return div.childElementCount == 1 && div.children[0].nodeName === "UL";
}

function shouldHTMLTextBeInsertedAsOrderedList(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    return div.childElementCount == 1 && div.children[0].nodeName === "OL";
}

function splitHTMLTextByListItemNodes(html) {
    let div = document.createElement("div");
    div.innerHTML = html;
    let list = div.children[0];
    let result = [];
    for (let i = 0; i < list.childElementCount; i++) {
        let child = list.children[i];
        result.push(child.textContent);
    }
    return result;
}

function insertMarkdownListWithLinePrefix(htmlText, andSelectAll, getPrefixForLineAtIndex) {
    getSelection().deleteFromDocument();
    let lines = splitHTMLTextByListItemNodes(htmlText);
    if (!lines.length)
        return;

    let range = getSelection().getRangeAt(0)
        , start = range.startContainer
        , end = range.endContainer;

    var firstDiv = null;
    var lastDiv = null;
    for (var i = lines.length - 1; i >= 0; i--) {
        let line = lines[i];
        let div = document.createElement("div");
        div.appendChild(document.createTextNode(getPrefixForLineAtIndex(i) + line));
        range.insertNode(div);
        firstDiv = div;
        if (!lastDiv)
            lastDiv = div;
    }

    getSelection().removeAllRanges();
    let newRange = document.createRange();
    if (andSelectAll)
        newRange.setStart(firstDiv, 0);
    else
        newRange.setStart(lastDiv, 1);
    newRange.setEnd(lastDiv, 1);
    getSelection().addRange(newRange);
}

function prependTextAtSelection(textAtIndex) {
    let range = getSelection().getRangeAt(0)
        , start = range.startContainer
        , end = range.endContainer
        , startOffset = range.startOffset
        , endOffset = range.endOffset;

    if (start == end) {
        let text = textAtIndex(0);
        if (start.nodeName == "DIV")
            insertTextAtSelection(text, false);
        else {
            start.textContent = stringByInsertingStringAtIndex(text, 0, start.textContent);
            getSelection().removeAllRanges();
            let newRange = document.createRange();
            newRange.setStart(start, startOffset + text.length);
            newRange.setEnd(end, endOffset + (start == end ? text.length : 0));
            getSelection().addRange(newRange);
        }
        return;
    }

    // The selection spans multiple nodes.
    // First, find all nodes between the start and end nodes (FIXME: this is an insane hack. We ought to take elements
    // at different heights in the DOM tree into account here).
    let startDiv = start.parentElement == editor ? start : start.parentElement;
    let endDiv = end.parentElement == editor ? end : end.parentElement;
    if (startDiv.parentElement != endDiv.parentElement)
        return;

    let children = [];
    let currentChild = startDiv;
    for (let currentChild = startDiv; currentChild && currentChild != endDiv; currentChild = currentChild.nextElementSibling)
        children.push(currentChild);
    children.push(endDiv);

    // Then, prepend text to each child element.
    for (let i = 0; i < children.length; i++)
        children[i].textContent = textAtIndex(i) + children[i].textContent;

    // Lastly, adjust the selection so that all affected nodes are selected.
    let newRange = document.createRange();
    newRange.setStart(children[0], 0);
    newRange.setEnd(children[children.length - 1], 1);
    getSelection().removeAllRanges();
    getSelection().addRange(newRange);
}

function insertTextAtSelection(s, andSelectAll) {
    let currentRange = getSelection().getRangeAt(0);
    getSelection().deleteFromDocument();
    let range = getSelection().getRangeAt(0);
    let textNode = document.createTextNode(s);
    range.insertNode(textNode);

    getSelection().removeAllRanges();
    let newRange = document.createRange();
    if (andSelectAll)
        newRange.setStart(textNode, 0);
    else
        newRange.setStart(textNode, s.length);
    newRange.setEnd(textNode, s.length);
    getSelection().addRange(newRange);
}

function surroundSelectionWithString(s) {
    let currentRange = getSelection().getRangeAt(0)
        , start = currentRange.startContainer
        , end = currentRange.endContainer
        , startOffset = currentRange.startOffset
        , endOffset = currentRange.endOffset;

    // First, insert the style decorators around the selected text.
    end.textContent = stringByInsertingStringAtIndex(s, endOffset, end.textContent);
    start.textContent = stringByInsertingStringAtIndex(s, startOffset, start.textContent);

    // Then, reset the selection to the the contents of the surrounded text.
    getSelection().removeAllRanges();
    let newRange = document.createRange();

    // HACK If the caret is at the beginning of a line in the editor, the start and end nodes will be the <div>, since
    // the text node did not exist before inserting the text content. We adjust the start and end nodes here to use the
    // first text node instead of the parent div.
    if (start.nodeName == "DIV")
        start = start.childNodes[0];
    if (end.nodeName == "DIV")
        end = end.childNodes[0];

    newRange.setStart(start, startOffset + s.length);
    newRange.setEnd(end, endOffset + (start == end ? s.length : 0));
    getSelection().addRange(newRange);
}

function tryToPerformSmartDelete(deletionRange) {
    let currentRange = getSelection().getRangeAt(0)
        , startOffset = currentRange.startOffset
        , endOffset = currentRange.endOffset
        , text = currentRange.startContainer;

    if (!currentRange.collapsed)
        return false;

    if (currentRange.startContainer != currentRange.endContainer)
        return false;

    if (deletionRange.startContainer != deletionRange.endContainer || deletionRange.startOffset != deletionRange.endOffset - 1)
        return false;

    let content = text.textContent;
    let textToDelete = content.substring(deletionRange.startOffset, deletionRange.endOffset);
    if (textToDelete !== "*" && textToDelete !== "_")
        return false;

    let indexOfBeginningMatch = content.lastIndexOf(textToDelete, deletionRange.startOffset - textToDelete.length - 1);
    if (indexOfBeginningMatch === -1 || indexOfBeginningMatch === deletionRange.startOffset)
        return false;

    let remainingText = content.substring(0, indexOfBeginningMatch)
        + content.substring(indexOfBeginningMatch + textToDelete.length, deletionRange.startOffset)
        + content.substring(deletionRange.endOffset);

    if (!remainingText.length)
        return false;

    text.textContent = remainingText;
    getSelection().removeAllRanges();
    let newRange = document.createRange();
    let newCaretPosition = deletionRange.endOffset - (2 * textToDelete.length);
    newRange.setStart(text, newCaretPosition);
    newRange.setEnd(text, newCaretPosition);
    getSelection().addRange(newRange);

    return true;
}

function toggleInputEventOverrides() {
    toggle.classList.remove(inputEventsEnabled ? "on" : "off");
    toggle.classList.add(inputEventsEnabled ? "off" : "on");
    inputEventsEnabled = !inputEventsEnabled;
    flashMessage(`${inputEventsEnabled ? "Enabled" : "Disabled"} input events`, inputEventsEnabled ? "#00C853" : "#F44336");
}

function scheduleMarkdownOutputUpdate() {
    let currentTime = new Date().getTime();
    if (updateMarkdownOutputTaskID) {
        clearTimeout(updateMarkdownOutputTaskID);
        updateMarkdownOutputTaskID = 0;
    }

    if (currentTime - lastMarkdownOutputUpdateTime > markdownOutputUpdateDelay)
        updateMarkdownOutputTaskID = setTimeout(updateMarkdownOutput, 0);
    else
        updateMarkdownOutputTaskID = setTimeout(updateMarkdownOutput, markdownOutputUpdateDelay);
}

function updateMarkdownOutput() {
    // FIXME: This awful whitespace hackery should not be necessary.
    let source = editor.innerText.replace(/\u00A0/g, " ").replace(/\n/g, "\n\n").replace(/\n+$/, "");
    output.innerHTML = micromarkdown.parse(source).replace(/<br\/><br\/>/g, "</br>");
    lastMarkdownOutputUpdateTime = new Date().getTime();
}
