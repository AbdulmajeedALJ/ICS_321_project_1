exports.firstFunction = (req, res, next) => {
  console.log("this log form controller");
  res.status(200).json({
    status: "success",
    message: "it is working",
  });
};

const fetchAll = async (req, res, tableName) => {
  try {
    const [rows] = await req.app.locals.query(`SELECT * FROM ${tableName}`);

    res.status(200).json({
      status: "success",
      results: rows.length,
      data: rows,
    });
  } catch (err) {
    console.error(`Failed to fetch ${tableName}`, err);
    res.status(500).json({
      status: "error",
      message: `Failed to fetch ${tableName}`,
    });
  }
};

exports.getHorses = (req, res) => fetchAll(req, res, "Horse");
exports.getOwners = (req, res) => fetchAll(req, res, "Owner");
exports.getOwns = (req, res) => fetchAll(req, res, "Owns");
exports.getStables = (req, res) => fetchAll(req, res, "Stable");
exports.getTrainers = (req, res) => fetchAll(req, res, "Trainer");
exports.getRaces = (req, res) => fetchAll(req, res, "Race");
exports.getRaceResults = (req, res) => fetchAll(req, res, "RaceResults");
exports.getTracks = (req, res) => fetchAll(req, res, "Track");
