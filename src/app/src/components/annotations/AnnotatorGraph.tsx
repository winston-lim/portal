/* eslint-disable prefer-template */
import { ApexOptions } from "apexcharts";
import React, { ReactElement, useMemo } from "react";
import ReactApexChart from "react-apexcharts";
import { AssetAPIObject } from "../../api/annotation";
import { RegisteredModel } from "./model";

type Tag = {
  id: number;
  name: string;
};

type Frame = {
  annotationID: string;
  bound: number[][];
  boundType: string;
  confidence: number;
  tag: Tag;
};

type AnnotationData = {
  fps: number;
  frames: {
    [key: string]: Frame[];
  };
};

type SeriesData = {
  [key: string]: number[];
};

type Series = {
  name: string;
  data: number[];
};

type ChartData = {
  series: Series[];
  options: ApexOptions;
  tooltipEnabledSeriesIndexes: number[];
};

type AnnotatorGraphProps = {
  currentAsset?: AssetAPIObject;
  isAnalyticsEnabled: boolean;
  confidence: number;
  annotatorData?: AnnotationData;
  tags?: {
    [key: string]: number;
  };
  setVideoOverlayTime: (dataPointIndex: number) => void;
  loadedModel: RegisteredModel | undefined;
};

const getSortedSeriesData = (
  tags: { [key: string]: number },
  annotatorData: AnnotationData,
  selectedConfidence: number
): Series[] => {
  const seriesData: SeriesData = {};
  Object.keys(tags).forEach(tag => {
    seriesData[tag] = [];
  });
  Object.keys(annotatorData.frames).forEach(frameKey => {
    const filteredWithCondidence = annotatorData.frames[frameKey].filter(
      data => data.confidence >= selectedConfidence
    );
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

const getTooltipEnabledSeriesIndexes = (series: Series[]): number[] => {
  const indexes: number[] = [];
  series.forEach((el, idx) => {
    const filteredData = el.data.filter(data => data !== 0);
    if (filteredData.length > 0) {
      indexes.push(idx);
    }
  });
  return indexes;
};

const updateTooltipStyles = (tooltipItems: number) => {
  const element = document.getElementsByClassName("apexcharts-tooltip")[0];
  element.setAttribute(
    "style",
    `width: ${Math.ceil(tooltipItems / 3) * 124}px`
  );
};

const getChartOptions = (
  annotatorData: AnnotationData,
  tooltipEnabledSeriesIndexes: number[],
  setVideoOverlayTime: (dataPointIndex: number) => void
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
          setVideoOverlayTime(config.dataPointIndex);
        },
        beforeMount: (_c, _o) => {
          console.log("apexchart: mounting");
        },
        mounted: (_c, _o) => {
          console.log("apexchart: mounted");
          updateTooltipStyles(tooltipEnabledSeriesIndexes.length);
        },
        updated: (_c, _o) => {
          console.log("apexchart: updated");
          updateTooltipStyles(tooltipEnabledSeriesIndexes.length);
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
        formatter: (value: number, _: any) =>
          (value / 1000).toFixed(3).toString(),
      },
      enabledOnSeries: tooltipEnabledSeriesIndexes,
    },
    legend: {
      show: false,
    },
  };
};

const isObjectEmpty = (object?: any) => {
  return Object.keys(object || {}).length === 0;
};

const AnnotatorGraph = ({
  isAnalyticsEnabled,
  currentAsset,
  confidence,
  annotatorData,
  tags,
  setVideoOverlayTime,
  loadedModel,
}: AnnotatorGraphProps): ReactElement => {
  const showChart =
    isAnalyticsEnabled &&
    currentAsset?.type === "video" &&
    Object.keys(annotatorData || {}).length !== 0;

  const chartData: ChartData | undefined = useMemo(() => {
    if (
      isObjectEmpty(annotatorData) ||
      isObjectEmpty(currentAsset) ||
      isObjectEmpty(tags)
    ) {
      return;
    }
    const series = getSortedSeriesData(
      tags as any,
      annotatorData as any,
      confidence
    );
    const tooltipEnabledSeriesIndexes = getTooltipEnabledSeriesIndexes(series);
    const options = getChartOptions(
      annotatorData as any,
      tooltipEnabledSeriesIndexes,
      setVideoOverlayTime
    );
    // eslint-disable-next-line consistent-return
    return { series, options, tooltipEnabledSeriesIndexes };
  }, [currentAsset, confidence, annotatorData, tags, loadedModel]);

  return (
    <div
      style={{
        display: isAnalyticsEnabled ? "block" : "none",
        position: "relative",
        minWidth: "100%",
        height: "100px",
      }}
    >
      {!showChart && isAnalyticsEnabled && currentAsset?.type === "image" && (
        <div>Analytics available for video assets only</div>
      )}
      {!showChart && isAnalyticsEnabled && currentAsset?.type === "video" && (
        <div>No annotation data for this model - run analytics first</div>
      )}
      <div style={{ display: showChart ? "block" : "none" }}>
        {showChart && chartData && (
          <ReactApexChart
            options={chartData?.options}
            series={chartData?.series}
            height="100px"
            width="100%"
          />
        )}
      </div>
    </div>
  );
};

export default React.memo(AnnotatorGraph);
