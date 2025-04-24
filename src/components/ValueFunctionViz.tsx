import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import './ValueFunctionViz.css';

interface ValueFunctionVizProps {
  valueFunction: { [key: string]: number };
  valueFunctionHistory: Array<{ [key: string]: number }>;
  selectedCell: [number, number] | null;
}

const ValueFunctionViz: React.FC<ValueFunctionVizProps> = ({
  valueFunction,
  valueFunctionHistory,
  selectedCell,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [processedHistory, setProcessedHistory] = useState<{ index: number, value: number }[]>([]);
  const [viewExtent, setViewExtent] = useState<[number, number]>([0, 20]);
  
  // Process the full history
  useEffect(() => {
    if (!selectedCell || valueFunctionHistory.length <= 1) {
      setProcessedHistory([]);
      return;
    }

    const cellKey = `${selectedCell[0]},${selectedCell[1]}`;
    
    // Map history to { index, value } pairs (filtering out index 0)
    const fullProcessed = valueFunctionHistory
      .map((vf, index) => ({
        index: index, 
        value: vf[cellKey] || 0
      }))
      .filter(point => point.index > 0);

    setProcessedHistory(fullProcessed);
    
    // Reset view extent when cell changes
    setViewExtent([1, Math.min(21, fullProcessed.length + 1)]);

  }, [selectedCell, valueFunctionHistory]); 
  
  // Draw the value function visualization
  useEffect(() => {
    if (!svgRef.current || processedHistory.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = svg.node()?.getBoundingClientRect().width || 400;
    const height = 200;
    
    // Get the full data range
    const allIndices = processedHistory.map(d => d.index);
    const minIndex = d3.min(allIndices) ?? 1;
    const maxIndex = d3.max(allIndices) ?? minIndex;
    const allValues = processedHistory.map(d => d.value);
    const minValue = d3.min(allValues) ?? 0;
    const maxValue = d3.max(allValues) ?? 1;
    
    // Set up scales - xScale will be based on current view extent
    const xScale = d3.scaleLinear()
      .domain(viewExtent)
      .range([margin.left, width - margin.right]);

    const yScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .nice()
      .range([height - margin.bottom, margin.top]);
      
    // Create a clip path to ensure elements stay within the plot area
    svg.append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", width - margin.left - margin.right)
      .attr("height", height - margin.top - margin.bottom);
      
    // Create a group for all visualization elements
    const chartGroup = svg.append("g")
      .attr("clip-path", "url(#clip)");
    
    // X-axis group (will be updated during zoom/pan)
    const xAxisGroup = svg.append('g')
      .attr('transform', `translate(0,${height - margin.bottom})`)
      .call(d3.axisBottom(xScale)
        .ticks(5)
        .tickFormat(d3.format("d"))
      );
      
    // X-axis label
    xAxisGroup.append('text')
      .attr('x', width / 2)
      .attr('y', 35)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text('Snapshot Index (Training Snapshots)');
      
    // Y-axis
    svg.append('g')
      .attr('transform', `translate(${margin.left},0)`)
      .call(d3.axisLeft(yScale))
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -height / 2)
      .attr('y', -35)
      .attr('fill', 'currentColor')
      .attr('text-anchor', 'middle')
      .text('Value');
      
    // Define the line generator
    const line = d3.line<{ index: number, value: number }>()
      .x(d => xScale(d.index))
      .y(d => yScale(d.value))
      .curve(d3.curveMonotoneX);
      
    // Add the line path to the clip group
    chartGroup.append('path')
      .datum(processedHistory)
      .attr('fill', 'none')
      .attr('stroke', 'steelblue')
      .attr('stroke-width', 1.5)
      .attr('d', line);
      
    // Add dots (also to clip group)
    const pointsToShow = processedHistory.length <= 10
      ? processedHistory
      : processedHistory.filter((_, i) =>
          i === 0 ||
          i === processedHistory.length - 1 ||
          i % Math.ceil(processedHistory.length / 10) === 0
        );
        
    chartGroup.selectAll('circle')
      .data(pointsToShow)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.index))
      .attr('cy', d => yScale(d.value))
      .attr('r', 4)
      .attr('fill', 'steelblue');
      
    // Add panning controls: left and right arrow buttons
    const controlsGroup = svg.append('g')
      .attr('class', 'pan-controls')
      .attr('transform', `translate(${width - 70}, ${height - margin.bottom + 10})`);
      
    // Left arrow
    controlsGroup.append('rect')
      .attr('x', 0)
      .attr('y', 0)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', '#ddd')
      .attr('stroke', '#999')
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('click', () => {
        // Pan left
        const [min, max] = viewExtent;
        const rangeSize = max - min;
        const step = Math.max(1, Math.floor(rangeSize / 4));
        
        // Don't go below the minimum index
        if (min - step >= minIndex) {
          setViewExtent([min - step, max - step]);
        } else if (min > minIndex) {
          // Adjust to exactly minIndex
          const diff = min - minIndex;
          setViewExtent([minIndex, max - diff]);
        }
      });
      
    controlsGroup.append('text')
      .attr('x', 10)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text('←');
      
    // Right arrow
    controlsGroup.append('rect')
      .attr('x', 30)
      .attr('y', 0)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', '#ddd')
      .attr('stroke', '#999')
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('click', () => {
        // Pan right
        const [min, max] = viewExtent;
        const rangeSize = max - min;
        const step = Math.max(1, Math.floor(rangeSize / 4));
        
        // Don't go beyond the maximum index
        if (max + step <= maxIndex) {
          setViewExtent([min + step, max + step]);
        } else if (max < maxIndex) {
          // Adjust to exactly maxIndex
          const diff = maxIndex - max;
          setViewExtent([min + diff, maxIndex]);
        }
      });
      
    controlsGroup.append('text')
      .attr('x', 40)
      .attr('y', 15)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .style('pointer-events', 'none')
      .text('→');
      
    // Add zoom out button (reset view)
    controlsGroup.append('rect')
      .attr('x', -30)
      .attr('y', 0)
      .attr('width', 20)
      .attr('height', 20)
      .attr('fill', '#ddd')
      .attr('stroke', '#999')
      .attr('rx', 3)
      .style('cursor', 'pointer')
      .on('click', () => {
        // Reset to show all data
        setViewExtent([minIndex, maxIndex]);
      });
      
    controlsGroup.append('text')
      .attr('x', -20)
      .attr('y', 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .attr('font-size', '10px')
      .style('pointer-events', 'none')
      .text('All');
      
    // Add drag-to-pan functionality
    let dragStartX: number | null = null;
    
    svg.call(
      d3.drag<SVGSVGElement, unknown>()
        .on('start', (event) => {
          dragStartX = event.x;
        })
        .on('drag', (event) => {
          if (dragStartX === null) return;
          
          // Calculate the pixel delta
          const deltaX = event.x - dragStartX;
          
          // Convert to domain units
          const rangeSize = width - margin.left - margin.right;
          const domainSize = viewExtent[1] - viewExtent[0];
          const domainDelta = -(deltaX / rangeSize) * domainSize;
          
          // Calculate new domain (prevent going out of bounds)
          let newMin = viewExtent[0] + domainDelta;
          let newMax = viewExtent[1] + domainDelta;
          
          if (newMin < minIndex) {
            newMax += (minIndex - newMin);
            newMin = minIndex;
          }
          
          if (newMax > maxIndex) {
            newMin -= (newMax - maxIndex);
            newMax = maxIndex;
            
            // Don't go below minimum
            if (newMin < minIndex) newMin = minIndex;
          }
          
          // Update view extent
          setViewExtent([newMin, newMax]);
          
          // Reset drag start position
          dragStartX = event.x;
        })
        .on('end', () => {
          dragStartX = null;
        })
    );
    
  }, [processedHistory, viewExtent]);
  
  // Display the current value of the selected cell
  const selectedCellValue = selectedCell
    ? valueFunction[`${selectedCell[0]},${selectedCell[1]}`] || 0
    : 0;
  
  return (
    <div className="value-function-viz">
      <h4>Value Function Visualization</h4>
      {selectedCell ? (
        <>
          <div className="selected-cell-info">
            <div>Selected Cell: [{selectedCell[0]}, {selectedCell[1]}]</div>
            <div>Current Value: {selectedCellValue.toFixed(2)}</div>
          </div>
          <svg ref={svgRef} width="100%" height="220"></svg>
          <div className="pan-instructions">
            <small>Drag to pan, use buttons to navigate</small>
          </div>
        </>
      ) : (
        <div className="no-cell-selected">Click a cell to see its value function progression</div>
      )}
    </div>
  );
};

export default ValueFunctionViz; 