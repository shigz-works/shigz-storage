/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('content_history').del();
  await knex('sections').del();
  await knex('topics').del();
  await knex('units').del();
  await knex('states').del();
  await knex('users').del();

  // Users
  await knex('users').insert([
    { id: 1, username: 'admin', password: 'password123', role: 'admin' },
    { id: 2, username: 'trainer', password: 'password123', role: 'trainer' }
  ]);

  // States
  const states = [
    { id: 1, name: 'Victoria', code: 'VIC' },
    { id: 2, name: 'New South Wales', code: 'NSW' },
    { id: 3, name: 'Queensland', code: 'QLD' },
    { id: 4, name: 'South Australia', code: 'SA' },
    { id: 5, name: 'Western Australia', code: 'WA' }
  ];
  await knex('states').insert(states);

  // Units
  const units = [];
  states.forEach((state, index) => {
    units.push({
      id: index + 1,
      code: 'CPPREP4001',
      title: 'Prepare for work in the real estate industry',
      state_id: state.id
    });
  });
  await knex('units').insert(units);

  // Topics
  const topics = [];
  units.forEach((unit, index) => {
    topics.push({
      id: index * 2 + 1,
      title: 'Industry Overview',
      unit_id: unit.id,
      order: 1
    });
    topics.push({
      id: index * 2 + 2,
      title: 'Ethical Standards',
      unit_id: unit.id,
      order: 2
    });
  });
  await knex('topics').insert(topics);

  // Sections
  const sections = [];
  topics.forEach((topic, index) => {
    sections.push({
      title: 'Introduction to Section',
      content: '<h1>Introduction</h1><p>Welcome to the ' + topic.title + ' topic.</p>',
      guide_type: 'learner',
      topic_id: topic.id,
      order: 1
    });
    sections.push({
      title: 'Assessment Overview',
      content: '<h1>Assessment</h1><p>Explain how this relates to ' + topic.title + '.</p>',
      guide_type: 'assessor',
      topic_id: topic.id,
      order: 2
    });
  });
  await knex('sections').insert(sections);
};
