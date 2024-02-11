import mongoose from "mongoose"

const medicalRecordSchema = new mongoose.Schema({
    
},{timestamps});

export const MedicalRecord = mongoose.model("MedicalRecord", medicalRecordSchema);

