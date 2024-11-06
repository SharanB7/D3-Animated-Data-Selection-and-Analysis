var penguins, pokemon, attributes = [], categoricalAttr, quantitativeAttr, dataset, scatterSvg,
    boxSvg, variableMap, reverseVariableMap, circles, scatterSvg, boxPlotSvg, scatterFlag = false,
    boxFlag = false, selectedPoints, selectedDots, colorScale, oldXScatterAxis, xScatterAxis,
    oldYScatterAxis, yScatterAxis, oldXBoxAxis, xBoxAxis, oldYBoxAxis, yBoxAxis, xScatterScale,
    yScatterScale, legendItems,
    unitList = ['mm', 'cm', 'm', 'in', 'ft', 'mg', 'g', 'kg', 'lb', 's', 'sec'];

document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
        d3.csv('data/penguins_cleaned.csv'),
        d3.csv('data/Pokemon.csv')
    ]).then(function (data) {
        penguins = data[0];
        pokemon = data[1];
        updateDataset();
    });
});

function updateDataset() {
    var selectedDataset = d3.select('#dataset-select').property('value');
    var colorScale1 = d3.scaleOrdinal(d3.schemeTableau10);
    var colorScale2 = d3.scaleOrdinal(d3.schemeDark2);
    var combinedRange = colorScale1.range().concat(colorScale2.range());
    colorScale = d3.scaleOrdinal()
        .range(combinedRange);
    switch (selectedDataset) {
        case 'penguins':
            dataset = penguins;
            break;
        case 'pokemon':
            dataset = pokemon;
            dataset = dropColumns(dataset, ['#', 'Name', 'Type 2']);
            break;
    };
    updateAttributes();
}

function dropColumns(dataset, columns) {
    return dataset.map(row => {
        const updatedRow = { ...row };
        columns.forEach(c => {
            delete updatedRow[c];
        });
        return updatedRow;
    });
}

function updateAttributes() {
    attributes = Object.keys(dataset[0]);
    categoricalAttr = [];
    quantitativeAttr = [];
    variableMap = {};
    reverseVariableMap = {};
    attributes.forEach(a => {
        var words = a.replace(/_/g, ' ').split(' ');
        if (unitList.includes(words[words.length - 1])) {
            words[words.length - 1] = '(' + words[words.length - 1] + ')';
        }
        for (var i = 0; i < words.length; i++) {
            words[i] = words[i].charAt(0).toUpperCase() + words[i].slice(1);
        }
        var attr = words.join(' ');
        variableMap[attr] = a;
        reverseVariableMap[a] = attr;
        if (isNaN(parseFloat(dataset[0][a]))) {
            categoricalAttr.push(attr);
        } else {
            quantitativeAttr.push(attr);
            dataset.forEach(d => {
                d[a] = +d[a];
            });
        }
    });
    updateAttribute('#x-attr-select', quantitativeAttr);
    updateAttribute('#y-attr-select', quantitativeAttr);
    updateAttribute('#color-select', categoricalAttr);
    updateAttribute('#box-plot-select', quantitativeAttr);

    d3.select('#y-attr-select').property('selectedIndex', quantitativeAttr.length > 1 ? 1 : 0);

    scatterSvg = d3.select('#scatter_svg');
    boxPlotSvg = d3.select('#box_svg');

    drawScatterPlot();
}

function updateAttribute(attribute, values) {
    d3.select(attribute)
        .selectAll('option')
        .remove();
    d3.select(attribute)
        .selectAll('option')
        .data(values)
        .enter()
        .append('option')
        .attr('value', d => variableMap[d])
        .text(d => d);
}

function drawScatterPlot() {
    var xAttr = d3.select('#x-attr-select').property('value');
    var yAttr = d3.select('#y-attr-select').property('value');
    var colorAttr = d3.select('#color-select').property('value');
    var margin = { top: 30, bottom: 55, left: 80, right: 330 };
    var width = +scatterSvg.style('width').replace('px', '');
    var height = +scatterSvg.style('height').replace('px', '');
    var innerWidth = width - (margin['left'] + margin['right']);
    var innerHeight = height - (margin['top'] + margin['bottom']);
    selectedPoints = [];
    d3.select('#lasso').remove();

    var cats = dataset.map(d => d[colorAttr]);
    cats = Array.from(new Set(cats));
    colorScale.domain(cats);

    var xMin = d3.min(dataset, d => d[xAttr]);
    var xMax = d3.max(dataset, d => d[xAttr]);
    var yMin = d3.min(dataset, d => d[yAttr]);
    var yMax = d3.max(dataset, d => d[yAttr]);
    var xAxisMin = xMin - 0.02 * Math.max(Math.abs(xMin), Math.abs(xMax));
    var xAxisMax = xMax + 0.02 * Math.max(Math.abs(xMin), Math.abs(xMax));
    var yAxisMin = yMin - 0.02 * Math.max(Math.abs(yMin), Math.abs(yMax));
    var yAxisMax = yMax + 0.02 * Math.max(Math.abs(yMin), Math.abs(yMax));

    var g = scatterSvg.select('g');

    if (g.empty()) {
        g = scatterSvg.append('g')
            .attr('transform', 'translate(' + margin['left'] + ', ' + margin['top'] + ')');
    }

    xScatterScale = d3.scaleLinear()
        .domain([xAxisMin, xAxisMax])
        .range([0, innerWidth]);

    yScatterScale = d3.scaleLinear()
        .domain([yAxisMin, yAxisMax])
        .range([innerHeight, 0]);

    xScatterAxis = d3.axisBottom(xScatterScale);
    yScatterAxis = d3.axisLeft(yScatterScale);

    scatterSvg.select('g').selectAll('.axis').remove();

    scatterSvg.select('g').selectAll('.axis').remove();
    scatterSvg.select('g').selectAll('.axis-label').remove();

    if (!scatterFlag) {
        oldXScatterAxis = xScatterAxis;
        oldYScatterAxis = yScatterAxis;
    }

    g.append('g').call(oldXScatterAxis)
        .attr('transform', 'translate(0,' + innerHeight + ')')
        .attr('class', 'axis')
        .transition()
        .duration(1000)
        .call(xScatterAxis);

    g.append('g').call(oldYScatterAxis)
        .attr('class', 'axis')
        .transition()
        .duration(1000)
        .call(yScatterAxis);

    g.selectAll('.scatter-circle')
        .data(dataset)
        .join(
            enter => enter.append('circle')
                .attr('class', 'scatter-circle')
                .attr('cx', - 100)
                .attr('cy', d => Math.random() * height)
                .attr('r', 5)
                .attr('id', (d, i) => {
                    return 'dot-' + i;
                })
                .call(enter => enter.transition().duration(3000)
                    .attr('cx', d => xScatterScale(d[xAttr]))
                    .attr('cy', d => yScatterScale(d[yAttr]))
                    .attr('r', 5)
                    .attr('fill', d => colorScale(d[colorAttr]))
                    .attr('fill-opacity', 0.6)
                    .attr('stroke', d => colorScale(d[colorAttr]))
                    .attr('stroke-width', 1)
                ),
            update => update
                .call(update => update.transition().duration(3000)
                    .attr('cx', d => xScatterScale(d[xAttr]))
                    .attr('cy', d => yScatterScale(d[yAttr]))
                    .attr('fill', d => colorScale(d[colorAttr]))
                    .attr('fill-opacity', 0.6)
                    .attr('stroke', d => colorScale(d[colorAttr]))
                    .attr('stroke-width', 1)
                ),
            exit => exit
                .call(exit => exit.transition().duration(3000)
                    .attr('cx', width + 100)
                    .attr('cy', d => Math.random() * height)
                    .attr('r', 5)
                    .remove()
                )
        )

    circles = g.selectAll('.scatter-circle')

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', - innerHeight / 2)
        .attr('y', - 40)
        .style('text-anchor', 'middle')
        .style('font-size', 14)
        .text(reverseVariableMap[yAttr]);

    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 40)
        .style('text-anchor', 'middle')
        .style('font-size', 14)
        .text(reverseVariableMap[xAttr]);

    g.selectAll('.tick text')
        .attr('transform', 'rotate(-20)')
        .style('text-anchor', 'end');

    var legend = g.append('g')
        .attr('class', 'legend')
        .attr('transform', 'translate(' + (innerWidth + 65) + ', 10)');

    legend.append('rect')
        .attr('class', 'legend-box')
        .attr('x', -25)
        .attr('y', -20)
        .attr('width', 270)
        .attr('height', 580)
        .style('rx', 3)
        .style('ry', 3)
        .style('fill', '#fefefe')
        .style('stroke', 'lightgray');

    legend.append('text')
        .attr('x', 0)
        .attr('y', 10)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .text('Category');

    legend.append('text')
        .attr('x', 160)
        .attr('y', 10)
        .attr('font-size', 14)
        .attr('font-weight', 'bold')
        .text('Selected #');

    legend.append('line')
        .attr('x1', -15)
        .attr('y1', 25)
        .attr('x2', 235)
        .attr('y2', 25)
        .attr('stroke', 'lightgray');

    legendItems = legend.selectAll('.legend-item')
        .data(colorScale.domain())
        .enter().append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => {
            var x = 0;
            var y = i * 25 + 40;
            return `translate(${x},${y})`;
        });

    legendItems.append('rect')
        .attr('x', 0)
        .attr('y', 2.5)
        .attr('width', 20)
        .attr('height', 5)
        .attr('fill', colorScale)
        .attr('fill-opacity', 0.6)
        .attr('stroke', colorScale);

    legendItems.append('text')
        .attr('class', 'legend-text')
        .attr('x', 40)
        .attr('y', 10)
        .style('font-size', 14)
        .text(d => d);

    oldXScatterAxis = xScatterAxis;
    oldYScatterAxis = yScatterAxis;
    scatterFlag = true;

    drawLasso();
    updateBoxPlot([]);
}

function drawLasso() {
    selectedPoints = [];
    var xAttr = d3.select('#x-attr-select').property('value');
    var yAttr = d3.select('#y-attr-select').property('value');
    const lineGenerator = d3.line();
    const pointInPolygon = function (point, vs) {
        var x = point[0],
            y = point[1];

        var inside = false;
        for (var i = 0, j = vs.length - 1; i < vs.length; j = i++) {
            var xi = vs[i][0] - 80,
                yi = vs[i][1] - 25;
            var xj = vs[j][0] - 80,
                yj = vs[j][1] - 25;

            var intersect =
                yi > y != yj > y &&
                x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
            if (intersect) inside = !inside;
        }

        return inside;
    };

    function drawPath() {
        d3.select('#lasso')
            .style('stroke', 'black')
            .style('stroke-width', 2)
            .style('fill', '#00000054')
            .attr('d', lineGenerator(selectedPoints));
        circles.each((d, i) => {
            d3.select('#dot-' + i).attr('fill-opacity', 0.6);
        });
    }

    function dragStart() {
        selectedPoints = [];
        d3.select('#lasso').remove();
        d3.select('#scatter_svg')
            .append('path')
            .attr('id', 'lasso');
        circles.each((d, i) => {
            d3.select('#dot-' + i).attr('fill-opacity', 0.6);
        });
    }

    function dragMove(event) {
        let mouseX = event.sourceEvent.offsetX;
        let mouseY = event.sourceEvent.offsetY;
        selectedPoints.push([mouseX, mouseY]);
        drawPath();
    }

    function dragEnd() {
        let selectedDots = [];
        circles.each((d, i) => {
            let point = [
                xScatterScale(d[xAttr]),
                yScatterScale(d[yAttr]),
            ];
            if (pointInPolygon(point, selectedPoints)) {
                d3.select('#dot-' + i).attr('fill-opacity', 1);
                selectedDots.push('dot-' + i);
            }
        });
        updateBoxPlot(selectedDots);
    }

    const drag = d3
        .drag()
        .on('start', dragStart)
        .on('drag', dragMove)
        .on('end', dragEnd);

    d3.select('#scatter_svg').call(drag);

}

function updateBoxPlot(selectedDots) {
    var boxAttr = d3.select('#box-plot-select').property('value');
    var colorAttr = d3.select('#color-select').property('value');
    var margin = { top: 30, bottom: 65, left: 80, right: 30 };
    var width = +boxPlotSvg.style('width').replace('px', '');
    var height = +boxPlotSvg.style('height').replace('px', '');
    var innerWidth = width - (margin['left'] + margin['right']);
    var innerHeight = height - (margin['top'] + margin['bottom']);
    var selectedData = [], groupedData = {};

    selectedDots.forEach(d => {
        var dot = d3.select('#' + d).datum();
        selectedData.push(dot);
        if (!groupedData[dot[colorAttr]]) {
            groupedData[dot[colorAttr]] = [];
        }
        groupedData[dot[colorAttr]].push(dot);
    });

    scatterSvg.select('g')
        .selectAll('.legend')
        .selectAll('.legend-item')
        .selectAll('.count')
        .transition()
        .duration(400)
        .style('opacity', 0)
        .remove()
        .end()
        .then(() => {
            scatterSvg.select('g')
                .selectAll('.legend')
                .selectAll('.legend-item')
                .append('text')
                .attr('class', 'count')
                .attr('x', 180)
                .attr('y', 10)
                .style('opacity', 0)
                .transition()
                .duration(400)
                .style('opacity', 1)
                .style('font-size', 14)
                .text(d => {
                    var bin = groupedData[d];
                    return bin ? bin.length : 0;
                });
        });


    var bins = [];
    for (var key in groupedData) {
        if (groupedData.hasOwnProperty(key)) {
            var bin = groupedData[key];
            bin.sort((a, b) => a[boxAttr] - b[boxAttr]);
            var values = bin.map(d => d[boxAttr]);
            var min = values[0];
            var max = values[values.length - 1];
            var q1 = d3.quantile(values, 0.25);
            var q2 = d3.quantile(values, 0.50);
            var q3 = d3.quantile(values, 0.75);
            var iqr = q3 - q1;
            var r0 = Math.max(min, q1 - iqr * 1.5);
            var r1 = Math.min(max, q3 + iqr * 1.5);

            if (bin.length < 5) {
                outliers = bin;
                q1 = null;
                q2 = null;
                q3 = null;
                r0 = null;
                r1 = null;
            } else {
                outliers = bin.filter(v => v[boxAttr] < r0 || v[boxAttr] > r1);
            }

            var binData = {
                quartiles: [q1, q2, q3],
                range: [r0, r1],
                outliers: outliers
            };

            bins.push({ key: key, data: binData });
        }
    }

    var nonNullBins = bins.filter(d => d.data.quartiles[0] !== null);

    var xBoxScale = d3.scaleBand()
        .domain(colorScale.domain())
        .range([0, innerWidth]);

    var yMin = d3.min(selectedData, d => d[boxAttr]);
    var yMax = d3.max(selectedData, d => d[boxAttr]);
    var yAxisMin = yMin - 0.02 * Math.max(Math.abs(yMin), Math.abs(yMax));
    var yAxisMax = yMax + 0.02 * Math.max(Math.abs(yMin), Math.abs(yMax));

    var yBoxScale = d3.scaleLinear()
        .domain([yAxisMin, yAxisMax])
        .range([innerHeight, 0]);

    xBoxAxis = d3.axisBottom(xBoxScale);
    yBoxAxis = d3.axisLeft(yBoxScale);

    var g = boxPlotSvg.select('g');

    if (g.empty()) {
        g = boxPlotSvg.append('g')
            .attr('transform', 'translate(' + margin['left'] + ', ' + margin['top'] + ')');
    }

    boxPlotSvg.select('g').selectAll('.axis').remove();
    boxPlotSvg.select('g').selectAll('.axis-label').remove();

    if (!boxFlag) {
        oldXBoxAxis = xBoxAxis;
        oldYBoxAxis = yBoxAxis;
    }

    g.append('g').call(oldXBoxAxis)
        .attr('transform', 'translate(0,' + innerHeight + ')')
        .attr('class', 'axis')
        .transition()
        .duration(1000)
        .call(xBoxAxis);

    g.append('g').call(oldYBoxAxis)
        .attr('class', 'axis')
        .transition()
        .duration(1000)
        .call(yBoxAxis);

    oldXBoxAxis = xBoxAxis;
    oldYBoxAxis = yBoxAxis;
    boxFlag = true;

    g.selectAll('.tick text')
        .attr('transform', 'rotate(-20)')
        .style('text-anchor', 'end');

    var boxWidth = Math.min(xBoxScale.bandwidth(), 30)
    g.selectAll('.box-rect')
        .data(nonNullBins, d => d.key)
        .join(
            enter => enter.append('rect')
                .attr('class', 'box-rect')
                .attr('x', d => xBoxScale(d.key) + (xBoxScale.bandwidth() - boxWidth) / 2)
                .attr('y', d => yBoxScale(d.data.quartiles[1]))
                .attr('width', boxWidth)
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 1000 + i * 300)
                    .attr('y', d => yBoxScale(d.data.quartiles[2]))
                    .attr('height', d => yBoxScale(d.data.quartiles[0]) - yBoxScale(d.data.quartiles[2]))
                    .attr('width', boxWidth)
                    .attr('stroke', d => colorScale(d.key))
                    .attr('stroke-width', 1)
                    .attr('fill', d => colorScale(d.key))
                    .attr('fill-opacity', 0.6)
                ),
            update => update
                .call(update => update.transition()
                    .duration(1000)
                    .delay((d, i) => 1000 + i * 300)
                    .attr('y', d => yBoxScale(d.data.quartiles[2]))
                    .attr('height', d => yBoxScale(d.data.quartiles[0]) - yBoxScale(d.data.quartiles[2]))
                ),
            exit => exit
                .call(exit => exit.transition()
                    .duration(1000)
                    .delay((d, i) => 1000 + i * 300)
                    .attr('height', 0)
                    .remove()
                )

        );

    g.selectAll('.vertical-line')
        .data(nonNullBins, d => d.key)
        .join(
            enter => enter.append('line')
                .attr('class', 'vertical-line')
                .attr('x1', d => xBoxScale(d.key) + (xBoxScale.bandwidth()) / 2)
                .attr('x2', d => xBoxScale(d.key) + (xBoxScale.bandwidth()) / 2)
                .attr('y1', d => yBoxScale(d.data.quartiles[1]))
                .attr('y2', d => yBoxScale(d.data.quartiles[1]))
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', d => yBoxScale(d.data.range[0]))
                    .attr('y2', d => yBoxScale(d.data.range[1]))
                    .attr('stroke', 'black')
                ),
            update => update
                .call(update => update.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', d => yBoxScale(d.data.range[0]))
                    .attr('y2', d => yBoxScale(d.data.range[1]))),
            exit => exit
                .call(exit => exit.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', height / 2)
                    .attr('y2', height / 2)
                    .remove()
                )
        );

    g.selectAll('.median-line')
        .data(nonNullBins, d => d.key)
        .join(
            enter => enter.append('line')
                .attr('class', 'median-line')
                .attr('x1', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y1', d => yBoxScale(d.data.quartiles[1]))
                .attr('x2', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y2', d => yBoxScale(d.data.quartiles[1]))
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('x1', d => xBoxScale(d.key) + (xBoxScale.bandwidth() - boxWidth) / 2)
                    .attr('stroke', 'black')
                ),
            update => update
                .call(update => update.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', d => yBoxScale(d.data.quartiles[1]))
                    .attr('y2', d => yBoxScale(d.data.quartiles[1]))),
            exit => exit
                .call(exit => exit.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', height / 2)
                    .attr('y2', height / 2)
                    .remove()
                )
        );

    g.selectAll('.min-line')
        .data(nonNullBins, d => d.key)
        .join(
            enter => enter.append('line')
                .attr('class', 'min-line')
                .attr('x1', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y1', d => yBoxScale(d.data.quartiles[1]))
                .attr('x2', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y2', d => yBoxScale(d.data.quartiles[1]))
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('x1', d => xBoxScale(d.key) + (xBoxScale.bandwidth() - boxWidth) / 2)
                    .attr('y1', d => yBoxScale(d.data.range[0]))
                    .attr('x2', d => xBoxScale(d.key) + (xBoxScale.bandwidth() + boxWidth) / 2)
                    .attr('y2', d => yBoxScale(d.data.range[0]))
                    .attr('stroke', 'black')
                ),
            update => update
                .call(update => update.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', d => yBoxScale(d.data.range[0]))
                    .attr('y2', d => yBoxScale(d.data.range[0]))),
            exit => exit
                .call(exit => exit.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', height / 2)
                    .attr('y2', height / 2)
                    .remove()
                )
        );

    g.selectAll('.max-line')
        .data(nonNullBins, d => d.key)
        .join(
            enter => enter.append('line')
                .attr('class', 'max-line')
                .attr('x1', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y1', d => yBoxScale(d.data.quartiles[1]))
                .attr('x2', d => xBoxScale(d.key) + xBoxScale.bandwidth() / 2)
                .attr('y2', d => yBoxScale(d.data.quartiles[1]))
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('x1', d => xBoxScale(d.key) + (xBoxScale.bandwidth() - boxWidth) / 2)
                    .attr('y1', d => yBoxScale(d.data.range[1]))
                    .attr('x2', d => xBoxScale(d.key) + (xBoxScale.bandwidth() + boxWidth) / 2)
                    .attr('y2', d => yBoxScale(d.data.range[1]))
                    .attr('stroke', 'black')
                ),
            update => update
                .call(update => update.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', d => yBoxScale(d.data.range[1]))
                    .attr('y2', d => yBoxScale(d.data.range[1]))),
            exit => exit
                .call(exit => exit.transition()
                    .duration(1000)
                    .delay((d, i) => 500 + i * 300)
                    .attr('y1', height / 2)
                    .attr('y2', height / 2)
                    .remove()
                )
        );

    g.selectAll('.outlier-circle')
        .data(bins, d => d.key)
        .join(
            enter => enter.selectAll('outlier-circle')
                .data(d => d.data.outliers)
                .enter()
                .append('circle')
                .attr('class', 'outlier-circle')
                .attr('cx', d => xBoxScale(d[colorAttr]) + (xBoxScale.bandwidth() - (boxWidth / 2)) / 2 + (boxWidth / 2) * Math.random())
                .attr('cy', d => yBoxScale(d[boxAttr]))
                .call(enter => enter.transition()
                    .duration(1000)
                    .delay((d, i) => 6000 + i * 500)
                    .attr('r', 4)
                    .attr('fill', d => colorScale(d[colorAttr]))
                    .attr('fill-opacity', 0.6)
                    .attr('stroke', d => colorScale(d[colorAttr]))
                    .attr('stroke-width', 1)
                ),
            exit => exit
                .call(exit => exit.selectAll('.outlier-circle')
                    .transition()
                    .duration(1000)
                    .delay((d, i) => i * 300)
                    .attr('opacity', 0)
                    .end()
                    .then(() => {
                        exit.remove()
                    })
                )
        );

    g.append('text')
        .attr('class', 'axis-label')
        .attr('transform', 'rotate(-90)')
        .attr('x', - innerHeight / 2)
        .attr('y', - 40)
        .style('text-anchor', 'middle')
        .style('font-size', 14)
        .text(reverseVariableMap[boxAttr]);

    g.append('text')
        .attr('class', 'axis-label')
        .attr('x', innerWidth / 2)
        .attr('y', innerHeight + 50)
        .style('text-anchor', 'middle')
        .style('font-size', 14)
        .text(reverseVariableMap[colorAttr]);

}