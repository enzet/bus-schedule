const input = document.getElementById("input");
const test = document.getElementById("test");

input.addEventListener("input", processUpdate);

elements = [];
pathElements = [];

const transliteration = {
    "а": "a", "б": "b", "в": "v", "г": "g",
    "д": "d", "е": "e", "ё": "yo", "ж": "zh",
    "з": "z", "и": "i", "й": "y", "к": "k",
    "л": "l", "м": "m", "н": "n", "о": "o",
    "п": "p", "р": "r", "с": "s", "т": "t",
    "у": "u", "ф": "f", "х": "kh", "ц": "ts",
    "ч": "ch", "ш": "sh", "щ": "shch", "ъ": "",
    "ы": "i", "ь": "", "э": "e", "ю": "yu", "я": "ya",
}

parse(input.textContent);

/**
 * Get lexemes for header configuration.
 * @param {String} text Input header configuration.
 */
function lexer(text) {

    var insideCircle = false;
    var insideSquare = false;
    var wasDash = false;

    var result = [];
    var current = "";

    for (var i = 0; i < text.length; i++) {

        const symbol = text.charAt(i);

        if (insideCircle) {
            if (symbol == ")") {
                result.push({"type": "symbol", "text": "(" + current + ")"});
                insideCircle = false;
                current = "";
            } else {
                current += symbol;
            }
        } else if (insideSquare) {
            if (symbol == "]") {
                result.push({"type": "square", "text": current});
                insideSquare = false;
                current = "";
            } else {
                current += symbol;
            }
        } else if (wasDash) {
            if (symbol == ">") {
                result.push({"type": "symbol", "text": "right arrow"});
            } else {
                result.push({"type": "letter", "text": "-"});
                result.push({"type": "letter", "text": symbol});
            }
            wasDash = false;
        } else if (symbol == "(") {
            insideCircle = true;
        } else if (symbol == "[") {
            insideSquare = true;
        } else if (symbol == "-") {
            wasDash = true;
        } else {
            result.push({"type": "letter", "text": symbol});
        }
    }

    return result;
}

/**
 * Draw hours and minutes.
 * @param {Number} x Left point of hour text element.
 * @param {Number} y Bottom point of hour text element.
 */
function drawHours(line, x, y, j) {

    if (line[0] != "-") {
        var hours = document.getElementById("hours" + j);
        if (hours == null) {
            hours = document.createElementNS(
                "http://www.w3.org/2000/svg", "text"
            );
            hours.setAttribute("id", "hours" + j);
            hours.style.fontSize = hourFontSize;
            hours.style.fill = primaryColor;
            elements.push(hours);
            canvas.append(hours);
        }
        hours.innerHTML = line[0];
        hours.setAttribute("x", x);
        hours.setAttribute("y", y);

        w = hours.getBBox().width;
    } else {
        w = 0;
    }
    currentX = x + w + minuteFirstSeparator;
    currentY = y - minuteLineHeight;

    for (k = 1; k < line.length; k++) {
        const minutesId = "minutes_" + j + "_" + k;
        var minutes = document.getElementById(minutesId);
        if (minutes == null) {
            minutes = document.createElementNS(
                "http://www.w3.org/2000/svg", "text"
            );
            minutes.setAttribute("id", minutesId);
            minutes.style.fontSize = minuteFontSize;
            minutes.style.fill = primaryColor;
            elements.push(minutes);
            canvas.append(minutes);
        }
        minutes.setAttribute("x", currentX);
        minutes.setAttribute("y", currentY);
        minutes.innerHTML = line[k];
        currentX += minutes.getBBox().width + minuteSeparator;

        if (k == Math.floor(line.length / 2)) {
            currentX = x + w + minuteFirstSeparator;
            currentY += minuteLineHeight;
        }
    }
    if (line.length == 2) {
        const minutesId = "minutes_" + j + "_min";
        var minutes = document.getElementById(minutesId);
        if (minutes == null) {
            minutes = document.createElementNS(
                "http://www.w3.org/2000/svg", "text"
            );
            minutes.setAttribute("id", minutesId);
            minutes.style.fontSize = minuteFontSize;
            minutes.style.fill = primaryColor;
            elements.push(minutes);
            canvas.append(minutes);
        }
        minutes.setAttribute("x", currentX);
        minutes.setAttribute("y", currentY);
        minutes.innerHTML = minuteText;

        if (k == Math.floor(line.length / 2)) {
            current = x + w + minuteFirstSeparator;
            currentY += minuteLineHeight;
        }
    }
}

/**
 * Draw column section.
 * @param {String} command Text configuration: starts with "#" and uses "/" to
 *     separate Russian text from its translation.
 * @param {Number} index Unique section index.
 * @param {Number} x Left point of section text element.
 * @param {Number} y Bottom point of section text element.
 */
function drawSection(command, index, x, y) {

    currentX = x;

    configurations = [
        {
            "id": "section_" + index,
            "size": sectionFontSize,
            "color": primaryColor,
        },
        {
            "id": "section_translation_" + index,
            "size": sectionTranslationFontSize,
            "color": secondaryColor,
        },
    ]
    content = command.trim().substring(1).trim().split("/");

    configurations.forEach((configuration, i) => {
        var text = document.getElementById(configuration["id"]);

        if (text == null) {
            text = document.createElementNS(
                "http://www.w3.org/2000/svg", "text"
            );
            text.setAttribute("id", configuration["id"]);
            text.style.fill = configuration["color"];
            text.style.fontSize = configuration["size"];
            text.style.fontWeight = "bold";
            elements.push(text);
            canvas.append(text);
        }
        if (content[i] != null) {
            text.innerHTML = content[i];
        }
        text.setAttribute("x", currentX);
        text.setAttribute("y", y);

        currentX += text.getBBox().width + sectionCaptionSeparator;
    });
}

/**
 * Draw the whole image.
 * @param {String} command Schedule configuration command.
 */
function draw(command) {

    elements.forEach(element => {
        element.setAttribute("x", -9999);
    });
    pathElements.forEach(element => {
        element.setAttribute("d", "");
    });

    lines = command.split(/\r?\n/);

    lexemes = lexer(lines[0].trim());

    var number = "";
    var text = "";
    var text2 = "";
    var maxX = 0;

    var insideNumber = false;

    for (var i = 0; i < lexemes.length; i++) {

        const lexeme = lexemes[i];

        if (lexeme["type"] == "letter") {
            var letter = lexeme["text"];
            text += lexeme["text"];
            if (letter in transliteration) {
                text2 += transliteration[letter];
            } else if (letter.toLowerCase() in transliteration) {
                text2 += transliteration[letter.toLowerCase()].toUpperCase();
            } else {
                text2 += letter;
            }
        }
        if (lexeme["type"] == "symbol") {
            if (lexeme["text"] == "right arrow") {
                text += " → ";
                text2 += " to ";
            }
            n = lexeme["text"].substring(1, 2);
            if (n in numbers) {
                t = (
                    "<tspan style=\"fill: " + numbers[n]["color"]
                    + ";\">" + numbers[n]["text"] + "</tspan>"
                );
                text += t;
                text2 += t;
            }
        }
        if (lexeme["type"] == "square") {
            number = lexeme["text"];
        }
    }

    var rect = document.getElementById("numberRectangle");
    if (rect == null) {
        rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");  
        rect.setAttribute("id", "numberRectangle");
        elements.push(rect);
        canvas.append(rect);
        rect.style.fill = routeColor;
    }
    rect.setAttribute("x", leftMargin);
    rect.setAttribute("y", topMargin);
    rect.setAttribute("height", routeHeight);

    var numberElement = document.getElementById("numberText");
    if (numberElement == null) {
        numberElement = document.createElementNS(
            "http://www.w3.org/2000/svg", "text"
        );
        numberElement.setAttribute("id", "numberText");
        elements.push(numberElement);
        canvas.append(numberElement);
        numberElement.style.fill = routeTextColor;
        numberElement.style.fontSize = routeFontSize;
        numberElement.style.fontWeight = "bold";
    }
    numberElement.setAttribute("x", routeX);
    numberElement.setAttribute("y", routeY);
    numberElement.innerHTML = number;
    const size = numberElement.getBBox();

    rect.setAttribute("width", size.width + (routeX - leftMargin) * 2);

    var x = 
        leftMargin + size.width + (routeX - leftMargin) * 2 + routeSeparator;
    maxX = Math.max(x, maxX);

    var captionElement = document.getElementById("captionText");
    if (captionElement == null) {
        captionElement = document.createElementNS(
            "http://www.w3.org/2000/svg", "text"
        );
        captionElement.setAttribute("id", "captionText");
        elements.push(captionElement);
        canvas.append(captionElement);
        captionElement.style.fontSize = captionFontSize;
        captionElement.style.fill = primaryColor;
        captionElement.style.fontWeight = "bold";
    }
    captionElement.setAttribute("x", x);
    captionElement.setAttribute("y", captionY);
    captionElement.innerHTML = text;

    var captionTransliterationElement = document.getElementById(
        "captionTransliterationText"
    );
    if (captionTransliterationElement == null) {
        captionTransliterationElement = document.createElementNS(
            "http://www.w3.org/2000/svg", "text"
        );
        captionTransliterationElement.setAttribute(
            "id", "captionTransliterationText"
        );
        elements.push(captionTransliterationElement);
        canvas.append(captionTransliterationElement);
        captionTransliterationElement.style.fontSize = 
            captionTransliterationFontSize;
        captionTransliterationElement.style.fill = secondaryColor;
    }
    captionTransliterationElement.setAttribute("x", x);
    captionTransliterationElement.setAttribute("y", captionTransliterationY);

    if (text2 != "") {
        captionTransliterationElement.innerHTML = "from " + text2;
    } else {
        captionTransliterationElement.innerHTML = "";
    }

    const captionSize = captionElement.getBBox();
    const captionTransliterationSize = captionTransliterationElement.getBBox();
    const captionWidth = Math.max(
        captionSize.width, captionTransliterationSize.width
    );

    maxX = Math.max(x + captionWidth + sectionSeparator + rightMargin, maxX);

    columnX = leftMargin - sectionWidth - sectionSeparator;
    columnY = sectionY;

    maxX = Math.max(
        columnX + sectionWidth + sectionSeparator + rightMargin, maxX
    );
    var maxY = sectionY;

    y = columnY;

    for (var j = 1; j < lines.length; j++) {

        if (lines[j].trim() == "") {
            continue;
        }
        if (lines[j].trim().charAt(0) == "#") {
            columnX += sectionWidth + sectionSeparator;
            maxX = Math.max(
                columnX + sectionWidth + sectionSeparator + rightMargin, maxX
            );
            x = columnX;
            y = columnY;
            drawSection(lines[j], j, x, y);
            continue;
        }
        line = lines[j].trim().split(" ");

        if (lines[j].charAt(0) != " ") {
            x = columnX;
            y += rowTopMargin;
            maxY = Math.max(y, maxY);
            var bar = document.getElementById("bar_" + j);
            if (bar == null) {
                bar = document.createElementNS(
                    "http://www.w3.org/2000/svg", "path"
                );
                bar.setAttribute("id", "bar_" + j);
                bar.style.strokeWidth = 0.5;
                bar.style.stroke = "black";
                pathElements.push(bar);
                canvas.append(bar);
            }
            bar.setAttribute(
                "d", "M " + x + "," + y + " L " + (x + sectionWidth) + "," + y
            );

            y += rowHeight;
            maxY = Math.max(y, maxY);

            drawHours(line, x, y, j);
        } else {
            x += columnStep;
            drawHours(line, x, y, j);
        }

    }
    canvas.setAttribute("height", maxY + bottomMargin);
    canvas.setAttribute("width", maxX);
    
}

function parse(command) {

    draw(command);
}

function processUpdate(event) {

    parse(event.target.value);
}
