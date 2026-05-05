/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema
    .createTable('users', (table) => {
      table.increments('id').primary();
      table.string('username').unique().notNullable();
      table.string('password').notNullable(); // In a real app, hash this
      table.string('role').notNullable(); // 'admin' or 'trainer'
    })
    .createTable('states', (table) => {
      table.increments('id').primary();
      table.string('name').notNullable();
      table.string('code').unique().notNullable(); // VIC, NSW, etc.
    })
    .createTable('units', (table) => {
      table.increments('id').primary();
      table.string('code').notNullable();
      table.string('title').notNullable();
      table.integer('state_id').unsigned().references('id').inTable('states').onDelete('CASCADE');
    })
    .createTable('topics', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.integer('unit_id').unsigned().references('id').inTable('units').onDelete('CASCADE');
      table.integer('order').defaultTo(0);
    })
    .createTable('sections', (table) => {
      table.increments('id').primary();
      table.string('title').notNullable();
      table.text('content');
      table.string('guide_type').notNullable(); // 'learner' or 'assessor'
      table.integer('topic_id').unsigned().references('id').inTable('topics').onDelete('CASCADE');
      table.integer('order').defaultTo(0);
    })
    .createTable('content_history', (table) => {
      table.increments('id').primary();
      table.integer('section_id').unsigned().references('id').inTable('sections').onDelete('CASCADE');
      table.text('old_content');
      table.integer('updated_by').unsigned().references('id').inTable('users');
      table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema
    .dropTableIfExists('content_history')
    .dropTableIfExists('sections')
    .dropTableIfExists('topics')
    .dropTableIfExists('units')
    .dropTableIfExists('states')
    .dropTableIfExists('users');
};
