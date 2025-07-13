import attendance from '@/services/mockData/attendance.json';

let attendanceData = [...attendance];
let lastId = Math.max(...attendanceData.map(att => att.Id), 0);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const attendanceService = {
async getAll() {
    try {
      await delay(300);
      return [...attendanceData];
    } catch (error) {
      console.error('Error fetching all attendance records:', error);
      throw new Error('Failed to fetch attendance records. Please try again.');
    }
  },

async getById(id) {
    try {
      await delay(200);
      
      if (!id || isNaN(parseInt(id))) {
        throw new Error('Invalid attendance record ID');
      }
      
      const record = attendanceData.find(att => att.Id === parseInt(id));
      if (!record) {
        throw new Error('Attendance record not found');
      }
      
      return { ...record };
    } catch (error) {
      console.error('Error fetching attendance record:', error);
      if (error.message.includes('Invalid') || error.message.includes('not found')) {
        throw error;
      }
      throw new Error('Failed to fetch attendance record. Please try again.');
    }
  },

  async create(attendanceRecord) {
    await delay(400);
    const newRecord = {
      ...attendanceRecord,
      Id: ++lastId,
      employeeId: parseInt(attendanceRecord.employeeId),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    attendanceData.push(newRecord);
    return { ...newRecord };
  },

  async update(id, updatedData) {
    await delay(300);
    const index = attendanceData.findIndex(att => att.Id === parseInt(id));
    if (index === -1) {
      throw new Error('Attendance record not found');
    }
    
    const updatedRecord = {
      ...attendanceData[index],
      ...updatedData,
      Id: parseInt(id),
      employeeId: parseInt(updatedData.employeeId || attendanceData[index].employeeId),
      updatedAt: new Date().toISOString()
    };
    
    attendanceData[index] = updatedRecord;
    return { ...updatedRecord };
  },

  async delete(id) {
    await delay(200);
    const index = attendanceData.findIndex(att => att.Id === parseInt(id));
    if (index === -1) {
      throw new Error('Attendance record not found');
    }
    
    const deletedRecord = attendanceData.splice(index, 1)[0];
    return { ...deletedRecord };
  },

async getByEmployeeId(employeeId) {
    try {
      await delay(250);
      
      if (!employeeId || isNaN(parseInt(employeeId))) {
        throw new Error('Invalid employee ID');
      }
      
      const records = attendanceData
        .filter(att => att.employeeId === parseInt(employeeId))
        .map(att => ({ ...att }));
      
      return records;
    } catch (error) {
      console.error('Error fetching attendance by employee:', error);
      if (error.message.includes('Invalid')) {
        throw error;
      }
      throw new Error('Failed to fetch employee attendance records. Please try again.');
    }
  },

  async getByDate(date) {
    await delay(250);
    return attendanceData
      .filter(att => att.date === date)
      .map(att => ({ ...att }));
  },

  async getByEmployeeAndDate(employeeId, date) {
    await delay(250);
    return attendanceData
      .filter(att => att.employeeId === parseInt(employeeId) && att.date === date)
      .map(att => ({ ...att }));
  },

async getByEmployeeAndDateRange(employeeId, startDate, endDate) {
    try {
      await delay(300);
      
      if (!employeeId || isNaN(parseInt(employeeId))) {
        throw new Error('Invalid employee ID');
      }
      
      if (!startDate || !endDate) {
        throw new Error('Start date and end date are required');
      }
      
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error('Invalid date format');
      }
      
      if (start > end) {
        throw new Error('Start date cannot be later than end date');
      }
      
      return attendanceData
        .filter(att => {
          const recordDate = new Date(att.date);
          return att.employeeId === parseInt(employeeId) && 
                 recordDate >= start && recordDate <= end;
        })
        .map(att => ({ ...att }));
    } catch (error) {
      console.error('Error fetching attendance by date range:', error);
      if (error.message.includes('Invalid') || error.message.includes('required')) {
        throw error;
      }
      throw new Error('Failed to fetch attendance records for the specified date range. Please try again.');
    }
  },

  async getByDateRange(startDate, endDate) {
    await delay(300);
    return attendanceData
      .filter(att => {
        const recordDate = new Date(att.date);
        const start = new Date(startDate);
        const end = new Date(endDate);
        return recordDate >= start && recordDate <= end;
      })
      .map(att => ({ ...att }));
  }
};

export default attendanceService;