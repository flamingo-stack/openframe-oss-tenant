# Fleet Activities Stream Join Implementation

Реализация Kafka Streams join между топиками activities и host_activities из Fleet MDM для создания обогащенных событий.

## Completed Tasks

- [x] Создание плана реализации

## In Progress Tasks

- [ ] Анализ структуры данных и проектирование схемы

## Future Tasks

- [x] Добавление зависимостей Spring Cloud Stream и Kafka Streams
- [x] Создание моделей данных для activities и host_activities
- [x] Настройка конфигурации Kafka Streams
- [x] Создание HostAgentCacheRepository для Redis кэширования
- [x] Создание FleetHostRepository и конфигурации Fleet Database
- [ ] Настройка временных окон (5-10 секунд) для join операций
- [ ] Реализация LEFT JOIN логики с временными окнами
- [ ] Реализация Redis lookup и Fleet DB fallback логики
- [ ] Создание схемы результирующего сообщения
- [ ] Реализация обработки Debezium событий
- [ ] Создание тестов для join операций
- [ ] Настройка мониторинга и метрик
- [ ] Документация API и схем

## Implementation Plan

### Архитектура решения

1. **Источники данных:**
   - Топик `fleet.activities.events` - события из таблицы activities (Debezium)
   - Топик `fleet.host_activities.events` - события из таблицы host_activities (Debezium)
   - Redis - кэш для agent_id по host_id
   - Fleet Database - источник данных для hosts таблицы

2. **Обработка:**
   - Kafka Streams приложение в openframe-stream сервисе
   - LEFT JOIN по полю `activity_id` (из host_activities) и `id` (из activities)
   - Временные окна (5-10 секунд) для ожидания связанных событий
   - Redis lookup по host_id для получения agent_id
   - Fallback: запрос к Fleet DB если agent_id нет в Redis
   - Обогащение данных activities информацией о host_id и agent_id

3. **Результат:**
   - Новый топик `fleet.mysql.events` с обогащенными событиями

### Инфраструктура

**Уже есть:**
- ✅ Kafka кластер (KRaft режим)
- ✅ Debezium Connect для CDC
- ✅ Топики создаются автоматически
- ✅ Мониторинг и метрики

**Нужно добавить:**
- ❌ Kafka Streams библиотеки в openframe-stream
- ❌ Spring Cloud Stream конфигурацию
- ❌ Stream processing логику
- ❌ Redis конфигурацию и сервис
- ❌ Fleet Database подключение
- ❌ Кэширование agent_id логики

### Технические компоненты

- Spring Cloud Stream с Kafka Streams (требует добавления)
- Обработка Debezium Change Data Capture (CDC) событий
- LEFT JOIN операция между топиками с временными окнами
- Временные окна (Tumbling/Hopping) для ожидания связанных событий
- Redis кэширование agent_id по host_id
- Fleet Database подключение для fallback запросов
- Схемы данных (JSON с Debezium envelope)
- Мониторинг и метрики
- Обработка ошибок и retry логика

### Текущее состояние openframe-stream

**Есть:**
- ✅ Spring Kafka (spring-kafka)
- ✅ Kafka Producer конфигурация
- ✅ Базовая структура приложения

**Нужно добавить:**
- ❌ Spring Cloud Stream (spring-cloud-stream)
- ❌ Kafka Streams (spring-cloud-stream-binder-kafka-streams)
- ❌ Kafka Streams конфигурация
- ❌ Stream processing логика

### Структура данных

**Activities топик:**
- `id` (int64) - уникальный идентификатор активности
- `created_at` (ZonedTimestamp) - время создания
- `user_id` (int64) - ID пользователя
- `user_name` (string) - имя пользователя
- `activity_type` (string) - тип активности
- `details` (JSON) - детали активности
- `streamed` (int16) - флаг стриминга
- `user_email` (string) - email пользователя

**Host Activities топик:**
- `host_id` (int64) - ID хоста
- `activity_id` (int64) - ID активности (связь с activities.id)

**Результирующий топик:**
- Все поля из activities
- Дополнительное поле `host_id` из host_activities (если есть связь)
- Дополнительное поле `agent_id` из Redis/Fleet DB (если есть host_id)
- Метаданные обработки (timestamp, source)

### Relevant Files

- `openframe/services/openframe-stream/` - Основной сервис для stream обработки
- `openframe/services/openframe-stream/src/main/java/com/openframe/stream/` - Java код
- `openframe/services/openframe-stream/src/main/resources/` - Конфигурация
- `openframe/manifests/microservices/openframe-stream/` - Kubernetes манифесты

## Технические детали

### Временные окна в Kafka Streams

**Что такое временные окна:**
Временные окна в Kafka Streams - это механизм для группировки событий по времени. Они позволяют:
- Ограничивать время ожидания для join операций
- Обрабатывать события, которые приходят с задержкой
- Управлять памятью и производительностью

**Типы окон:**
- **Tumbling Window** - фиксированные непересекающиеся окна
- **Hopping Window** - окна с перекрытием
- **Session Window** - окна на основе активности

**Можно ли без временных окон:**
Да, можно! Для вашего случая LEFT JOIN без временных окон будет работать следующим образом:
- Все события из activities будут обрабатываться немедленно
- Если есть соответствующая запись в host_activities - добавляется host_id
- Если нет - отправляется событие без host_id
- Это проще в реализации и подходит для ваших требований

**НО есть проблема с порядком событий:**
Если Activity придет раньше HostActivity, то событие будет отправлено без host_id, даже если HostActivity придет через секунду.

### План реализации без временных окон

1. **Поток activities** - основной поток данных
2. **Поток host_activities** - используется как lookup таблица
3. **LEFT JOIN** - каждое событие из activities обогащается host_id если есть связь
4. **Результат** - отправляется в `fleet.mysql.events` топик

### Сценарии обработки событий

**Сценарий 1: События приходят одновременно (идеальный случай)**
- Activity и HostActivity создаются в одной транзакции
- Debezium отправляет события практически одновременно
- LEFT JOIN найдет соответствие и обогатит событие host_id

**Сценарий 2: HostActivity приходит раньше Activity (1 секунда разницы)**
- HostActivity приходит первым → сохраняется в lookup таблице
- Activity приходит через 1 секунду → LEFT JOIN найдет соответствие
- Результат: обогащенное событие с host_id

**Сценарий 3: Activity приходит раньше HostActivity (1 секунда разницы)**
- Activity приходит первым → LEFT JOIN не найдет соответствие
- Результат: событие БЕЗ host_id
- HostActivity приходит через 1 секунду → сохраняется в lookup таблице
- **Проблема**: Activity уже обработано без host_id

**Сценарий 4: HostActivity приходит намного позже (несколько секунд)**
- Activity обрабатывается без host_id
- HostActivity приходит позже → lookup таблица обновляется
- **Проблема**: Activity уже отправлено без host_id

### Обработка Debezium событий

- Фильтрация только INSERT/UPDATE событий (op = 'c' или 'u')
- Извлечение данных из поля `after`
- Игнорирование DELETE событий (op = 'd')
- Обработка snapshot событий (op = 'r')

### Решения для проблемы порядка событий

**Вариант 1: Использовать временные окна (рекомендуется)**
- Настроить окно в 5-10 секунд для ожидания HostActivity
- Если HostActivity не придет в течение окна - отправлять Activity без host_id
- Это гарантирует, что большинство событий будут обогащены

**Вариант 2: Буферизация Activity событий**
- Временно сохранять Activity события в памяти
- Ждать появления соответствующего HostActivity
- Отправлять обогащенное событие или с таймаутом

**Вариант 3: Двухфазная обработка**
- Фаза 1: Обрабатывать все события как есть (быстро)
- Фаза 2: Отдельный процесс для "дообогащения" событий без host_id

**Выбранное решение:**
Использовать **Вариант 1** с временным окном 5-10 секунд, так как:
- Простота реализации
- Гарантированная обработка большинства событий
- Контролируемая задержка
- Стандартный подход в Kafka Streams

### Альтернативные подходы для join топиков

**1. Kafka Streams (выбранный) ✅**
- Временные окна для join
- Exactly-once semantics
- Нативная интеграция с Kafka

**2. ksqlDB (SQL для Kafka)**
- SQL-подобный язык
- Встроенная поддержка временных окон
- Визуальный интерфейс
- Простота для SQL разработчиков
- Отдельный сервер ksqlDB

**3. Apache NiFi (у вас уже есть)**
- Визуальный интерфейс
- Простота настройки
- Ограниченная поддержка временных окон

**4. Custom Application с Spring Kafka**
- Простота реализации
- Полный контроль над логикой
- Нет встроенной поддержки временных окон

**5. Apache Flink**
- Мощный stream processing
- Сложность развертывания
- Отдельный кластер

**6. Kafka Connect + Custom Processor**
- Гибкость в обработке
- Сложность реализации join логики
- Нет встроенной поддержки временных окон

### Конфигурация временных окон

- **Тип окна:** Hopping Window (с перекрытием)
- **Размер окна:** 10 секунд
- **Шаг окна:** 5 секунд
- **Логика:** Ожидание HostActivity в течение 10 секунд после получения Activity
- **Fallback:** Если HostActivity не придет в течение окна - отправлять Activity без host_id 