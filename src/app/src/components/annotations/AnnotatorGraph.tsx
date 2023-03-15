/* eslint-disable prefer-template */
import { ApexOptions } from "apexcharts";
import React, { ReactElement, useMemo } from "react";
import ReactApexChart from "react-apexcharts";

type TagName = string;

type Frame = {
  confidence: number; // 0 to 1
  tag: { name: TagName };
};

type AnnotationData = {
  fps: number;
  frames: {
    [key: number]: Frame[];
  };
};

type TagFrequency = number;

type SeriesData = {
  name: TagName;
  data: TagFrequency[];
};

type ChartData = {
  series: SeriesData[];
  options: ApexOptions;
  tooltipEnabledSeriesIndexes: number[]; // these are filtered series(tags) that have some time interval where count is non zero
};

type AnnotatorGraphProps = {
  confidence: number;
  annotatorData: AnnotationData;
  tags: {
    [key: string]: number;
  };
  onChartClick: (dataPointIndex: number) => void;
};

// Filters based on selected confidence level, then sorts series/tags in descending frequency
const getSortedSeriesData = (
  tags: { [key: string]: number },
  annotatorData: AnnotationData,
  selectedConfidence: number
): SeriesData[] => {
  const seriesData: {
    [key: string]: number[];
  } = {};
  Object.keys(tags).forEach(tag => {
    seriesData[tag] = [];
  });
  Object.keys(annotatorData.frames).forEach((frameKey: string) => {
    const filteredWithCondidence = annotatorData.frames[
      parseInt(frameKey, 10)
    ].filter(data => data.confidence >= selectedConfidence);
    const countMap = filteredWithCondidence.reduce(
      (accum: Map<string, number>, current) =>
        accum.set(current.tag.name, (accum.get(current.tag.name) || 0) + 1),
      new Map()
    );
    Object.keys(tags).forEach(tag => {
      if (!countMap.has(tag)) {
        seriesData[tag].push(0);
      }
    });
    countMap.forEach((v, k) => seriesData[k].push(v));
  });
  const unsortedSeries = Object.keys(seriesData).map(seriesKey => ({
    name: seriesKey,
    data: seriesData[seriesKey],
  }));
  return unsortedSeries.sort((a, b) => {
    const totalCountA = a.data.reduce((accum, current) => accum + current, 0);
    const totalCountB = b.data.reduce((accum, current) => accum + current, 0);
    return totalCountB - totalCountA;
  });
};

// Filters out series/tags with zero count in all frames
const getTooltipEnabledSeriesIndexes = (series: SeriesData[]): number[] => {
  const indexes: number[] = [];
  series.forEach((el, idx) => {
    const filteredData = el.data.filter(data => data !== 0);
    if (filteredData.length > 0) {
      indexes.push(idx);
    }
  });
  return indexes;
};

// Updates tool tip width based on number of rendered items(filtered series/tags)
const updateTooltipWidth = (tooltipItems: number) => {
  const element = document.getElementsByClassName("apexcharts-tooltip")[0];
  element.setAttribute(
    "style",
    `width: ${Math.ceil(tooltipItems / 3) * 124}px`
  );
};

const getChartOptions = (
  annotatorData: AnnotationData,
  tooltipEnabledSeriesIndexes: number[],
  onChartClick: (dataPointIndex: number) => void
): ApexOptions => {
  const categories = Object.keys(annotatorData.frames).map(frameKey =>
    parseInt(frameKey, 10)
  );
  return {
    chart: {
      height: 350,
      type: "area",
      toolbar: {
        show: false,
      },
      animations: {
        enabled: false,
      },
      sparkline: {
        enabled: true,
      },
      events: {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        click: (_event, _chartContext, config) => {
          onChartClick(config.dataPointIndex);
        },
        mounted: (_chart, _options) => {
          updateTooltipWidth(tooltipEnabledSeriesIndexes.length);
        },
        updated: (_chart, _options) => {
          updateTooltipWidth(tooltipEnabledSeriesIndexes.length);
        },
      },
    },
    dataLabels: {
      enabled: false,
    },
    stroke: {
      curve: "smooth",
    },
    xaxis: {
      type: "numeric",
      categories,
    },
    tooltip: {
      theme: "dark",
      x: {
        formatter: (value: number, _opts: any) =>
          (value / 1000).toFixed(3).toString(),
      },
      enabledOnSeries: tooltipEnabledSeriesIndexes,
    },
    legend: {
      show: false,
    },
  };
};

const AnnotatorGraph = ({
  confidence,
  annotatorData,
  tags,
  onChartClick,
}: AnnotatorGraphProps): ReactElement => {
  const chartData: ChartData = useMemo(() => {
    const series = getSortedSeriesData(tags, annotatorData, confidence);
    const tooltipEnabledSeriesIndexes = getTooltipEnabledSeriesIndexes(series);
    const options = getChartOptions(
      annotatorData as any,
      tooltipEnabledSeriesIndexes,
      onChartClick
    );
    return { series, options, tooltipEnabledSeriesIndexes };
  }, [confidence, annotatorData, tags]);

  return (
    <div style={{ minWidth: "100%", height: "100px" }}>
      <ReactApexChart
        options={chartData?.options}
        series={chartData?.series}
        height="100px"
        width="100%"
      />
    </div>
  );
};

export default React.memo(AnnotatorGraph);
