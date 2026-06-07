
/** adjusted to use actual min, max*/
export const ScaledRenderer = (x_min: number, x_max: number, y_min: number, y_max: number, metadata: { width: number, height: number, buffer?: number }) => {
  const x_range = x_max - x_min;
  const y_range = y_max - y_min;

  const buffer = metadata.buffer || 0;
  const width = metadata.width - (2 * buffer);
  const height = metadata.height - (2 * buffer);

  const func = (x: number, y: number) => {
    const x1 = buffer + ((x - x_min) / x_range) * width;
    const y1 = buffer + height - (((y - y_min) / y_range) * height);
    return [x1, y1];
  };

  return func;
};

/**
 * render one of our graphs
 */
export const RenderGraph = (size: {width: number, height: number}, points: number[], min: number, max: number, type: 'line'|'points' = 'line') => {

  // console.info({points, min, max, type});

  let renderer = ScaledRenderer(
      min, max, 
      0, points.length, 
      size,
    );

  // console.info({graph_size, renderer});

  const copy = points.slice(0);
  copy.sort((a, b) => a - b);

  let path: string[] = [];

  // console.info({min, max, range, parms: result.parameters, copy});

  if (type === 'points') {

    const radius = 2;

    for (const [index, point] of copy.entries()) {
      const [x, y] = renderer(point, index);

      // path.push(`${x},${y}`);
      path.push(`M${x},${y - radius}`);
      path.push(`A${radius} ${radius} 0 0 0 ${x},${y + radius}`);
      path.push(`A${radius} ${radius} 0 0 0 ${x},${y - radius}`);

    }
    
    return path.join(' '); 
   
  }
  else {
    for (const [index, point] of copy.entries()) {
      const [x, y] = renderer(point, index);
      path.push(`${x},${y}`);
    }
    
    return 'M' + path.join(' L'); 
  }

}
