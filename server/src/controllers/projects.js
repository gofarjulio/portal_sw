const db = require('../config/db');

exports.getAllProjects = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM projects ORDER BY created_at DESC');
    res.json(rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
};

exports.createProject = async (req, res) => {
  const { name, takt_time } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO projects (name, takt_time) VALUES (?, ?)',
      [name, takt_time]
    );
    res.status(201).json({ id: result.insertId, name, takt_time });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create project' });
  }
};

exports.getProductionCapacity = async (req, res) => {
  const { projectId } = req.params;
  try {
    // 1. Fetch Process aggregated CTs from DB
    const [processes] = await db.query(`
      SELECT p.name, p.manpower, SUM(AVG(s.time_value)) as process_ct
      FROM processes p
      JOIN work_elements we ON we.process_id = p.id
      JOIN time_samples s ON s.work_element_id = we.id
      WHERE p.project_id = ?
      GROUP BY p.id
    `, [projectId]);

    if (processes.length === 0) {
      return res.json({ processes: [], bottleneckProcess: null, lineCycleTime: 0, lineCapacityPerHour: 0 });
    }

    // 2. Locate Bottleneck
    let bottleneck = processes[0];
    processes.forEach(p => {
      if (p.process_ct > bottleneck.process_ct) bottleneck = p;
    });

    // 3. Output logic
    res.json({
      processes,
      bottleneckProcess: bottleneck.name,
      lineCycleTime: bottleneck.process_ct,
      lineCapacityPerHour: bottleneck.process_ct ? Math.floor(3600 / bottleneck.process_ct) : 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to calculate TSKP capacity' });
  }
};

exports.getYamazumiData = async (req, res) => {
  const { projectId } = req.params;
  try {
    // Grouping by Process and Waste Classification (VA, NVA, NNVA)
    const [data] = await db.query(`
      SELECT p.name as processName, we.waste_class as wasteClass, SUM(s.time_value) / COUNT(DISTINCT s.sample_number) as averageTime
      FROM processes p
      JOIN work_elements we ON we.process_id = p.id
      JOIN time_samples s ON s.work_element_id = we.id
      WHERE p.project_id = ?
      GROUP BY p.id, we.waste_class
    `, [projectId]);

    // Pivot data to format suitable for Recharts: [{ processName: 'Station 1', VA: 15, NVA: 5, NNVA: 2 }]
    const formattedData = {};
    data.forEach(row => {
      if (!formattedData[row.processName]) {
        formattedData[row.processName] = { processName: row.processName, VA: 0, NVA: 0, NNVA: 0 };
      }
      formattedData[row.processName][row.wasteClass] = Number(row.averageTime);
    });

    res.json(Object.values(formattedData));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get Yamazumi' });
  }
};
