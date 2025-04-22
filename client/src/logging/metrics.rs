use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::RwLock;
use tracing::{Event, Subscriber};
use tracing_subscriber::Layer;

/// Metric types we support
#[derive(Debug, Clone)]
pub enum MetricValue {
    Counter(u64),
    Gauge(f64),
    Histogram(Vec<f64>),
}

/// A metric with its metadata
#[derive(Debug, Clone)]
pub struct Metric {
    name: String,
    value: MetricValue,
    labels: HashMap<String, String>,
    timestamp: chrono::DateTime<chrono::Utc>,
}

/// Storage for our metrics
#[derive(Default)]
pub struct MetricsStore {
    metrics: HashMap<String, Metric>,
}

impl MetricsStore {
    pub fn new() -> Self {
        Self {
            metrics: HashMap::new(),
        }
    }

    pub fn record_counter(&mut self, name: &str, value: u64, labels: HashMap<String, String>) {
        self.metrics.insert(
            name.to_string(),
            Metric {
                name: name.to_string(),
                value: MetricValue::Counter(value),
                labels,
                timestamp: chrono::Utc::now(),
            },
        );
    }

    pub fn record_gauge(&mut self, name: &str, value: f64, labels: HashMap<String, String>) {
        self.metrics.insert(
            name.to_string(),
            Metric {
                name: name.to_string(),
                value: MetricValue::Gauge(value),
                labels,
                timestamp: chrono::Utc::now(),
            },
        );
    }

    pub fn record_histogram(&mut self, name: &str, value: f64, labels: HashMap<String, String>) {
        let metric = self
            .metrics
            .entry(name.to_string())
            .or_insert_with(|| Metric {
                name: name.to_string(),
                value: MetricValue::Histogram(Vec::new()),
                labels,
                timestamp: chrono::Utc::now(),
            });

        if let MetricValue::Histogram(values) = &mut metric.value {
            values.push(value);
        }
    }

    pub fn get_metrics(&self) -> Vec<&Metric> {
        self.metrics.values().collect()
    }
}

/// Layer that captures metrics from tracing events
#[derive(Clone)]
pub struct MetricsLayer {
    store: Arc<RwLock<MetricsStore>>,
}

impl MetricsLayer {
    pub fn new() -> (Self, Arc<RwLock<MetricsStore>>) {
        let store = Arc::new(RwLock::new(MetricsStore::new()));
        (
            Self {
                store: store.clone(),
            },
            store,
        )
    }
}

impl<S> Layer<S> for MetricsLayer
where
    S: Subscriber,
{
    fn on_event(&self, event: &Event<'_>, _ctx: tracing_subscriber::layer::Context<'_, S>) {
        // Extract metric information from the event
        let mut visitor = MetricVisitor::default();
        event.record(&mut visitor);

        if let Some((name, value, labels)) = visitor.metric {
            let mut store = self.store.blocking_write();
            match value {
                MetricValue::Counter(v) => store.record_counter(&name, v, labels),
                MetricValue::Gauge(v) => store.record_gauge(&name, v, labels),
                MetricValue::Histogram(v) => {
                    for value in v {
                        store.record_histogram(&name, value, labels.clone());
                    }
                }
            }
        }
    }
}

#[derive(Default)]
struct MetricVisitor {
    metric: Option<(String, MetricValue, HashMap<String, String>)>,
}

impl tracing::field::Visit for MetricVisitor {
    fn record_f64(&mut self, field: &tracing::field::Field, value: f64) {
        if field.name() == "gauge" {
            self.metric = Some((
                field.name().to_string(),
                MetricValue::Gauge(value),
                HashMap::new(),
            ));
        } else if field.name() == "histogram" {
            self.metric = Some((
                field.name().to_string(),
                MetricValue::Histogram(vec![value]),
                HashMap::new(),
            ));
        }
    }

    fn record_u64(&mut self, field: &tracing::field::Field, value: u64) {
        if field.name() == "counter" {
            self.metric = Some((
                field.name().to_string(),
                MetricValue::Counter(value),
                HashMap::new(),
            ));
        }
    }

    fn record_debug(&mut self, field: &tracing::field::Field, value: &dyn std::fmt::Debug) {
        if let Some((_, _, labels)) = &mut self.metric {
            labels.insert(field.name().to_string(), format!("{:?}", value));
        }
    }
}
