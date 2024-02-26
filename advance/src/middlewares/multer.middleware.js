import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/temp"); // Set the destination folder for uploaded files
    },
    filename: function (req, file, cb) {
      // Set the filename to be unique (e.g., timestamp + original name)
      // const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, file.originalname);
    },
  });
  
   export const upload = multer({ storage: storage });