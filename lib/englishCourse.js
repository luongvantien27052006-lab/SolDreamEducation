'use strict';

const defaults = require('../data/english-course.json');
const DATASET_KEY = 'english-course';
const isEnglishCourse = course => /tiếng anh|english/i.test(course?.language || '');

function getEnglishCourseContent(course) {
  if (!isEnglishCourse(course)) return null;
  const data = require('./siteContent').getDataset(DATASET_KEY, defaults);
  return data.enabled ? data : null;
}

function getEnglishCourseNotice(course) {
  return isEnglishCourse(course) ? require('./siteContent').getDataset(DATASET_KEY, defaults).notice : '';
}

module.exports = { DATASET_KEY, isEnglishCourse, getEnglishCourseContent, getEnglishCourseNotice };
