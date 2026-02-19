'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

type DailyPoint = {
  day: string;
  checks: number;
  served: number;
  configFetches: number;
};

type LabelValuePoint = {
  label: string;
  value: number;
};

const piePalette = ['#0f766e', '#2e7d6f', '#5d9d8d', '#9dc4b6', '#c6e2d7', '#edaa7a'];

type DashboardChartsProps = {
  daily: DailyPoint[];
  platforms: LabelValuePoint[];
  versions: LabelValuePoint[];
  channels: LabelValuePoint[];
};

export function DashboardCharts({ daily, platforms, versions, channels }: DashboardChartsProps) {
  return (
    <>
      <div className="grid-2" style={{ marginTop: '0.9rem' }}>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Uso diario (30 días)</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={daily}>
                <CartesianGrid stroke="#dce7df" strokeDasharray="4 4" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="checks" stroke="#0f766e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="served" stroke="#e07c43" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="configFetches" stroke="#35554a" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Distribución por plataforma</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={platforms} dataKey="value" nameKey="label" outerRadius={90} label>
                  {platforms.map((entry, index) => (
                    <Cell key={entry.label} fill={piePalette[index % piePalette.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>

      <div className="grid-2" style={{ marginTop: '0.9rem' }}>
        <article className="card">
          <h3 style={{ marginTop: 0 }}>Versiones de app más activas</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={versions}>
                <CartesianGrid stroke="#dce7df" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#0f766e" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="card">
          <h3 style={{ marginTop: 0 }}>Canales OTA</h3>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer>
              <BarChart data={channels}>
                <CartesianGrid stroke="#dce7df" strokeDasharray="4 4" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#e07c43" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </>
  );
}
