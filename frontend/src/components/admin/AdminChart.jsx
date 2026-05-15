import React from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

const CHART_COMPONENTS = {
  bar: Bar,
  doughnut: Doughnut,
  line: Line,
};

const AdminChart = ({ type, ...props }) => {
  const ChartComponent = CHART_COMPONENTS[type];
  if (!ChartComponent) return null;

  return <ChartComponent {...props} />;
};

export default AdminChart;
