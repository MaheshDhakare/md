exports.up = async function(knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS pgcrypto');

  await knex.schema.createTable('users', function(t){
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('name').notNullable();
    t.string('email').unique();
    t.string('phone');
    t.string('role').defaultTo('user');
    t.string('password_hash');
    t.timestamps(true, true);
  });

  await knex.schema.createTable('properties', function(t){
    t.string('id').primary();
    t.string('title').notNullable();
    t.text('summary');
    t.text('address');
    t.string('status').defaultTo('Available');
    t.string('type').defaultTo('Property');
    t.uuid('created_by');
    t.jsonb('images');              // array of uploaded images {url, visible, ...}
    t.jsonb('extra_fields');        // dynamic fields
    t.jsonb('asset_visibility_map');// visibility ACLs
    t.string('owner');
    t.timestamps(true, true);
    t.foreign('created_by').references('users.id').onDelete('SET NULL');
  });

  await knex.schema.createTable('attachments', function(t){
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('property_id');
    t.string('filename');
    t.string('url');
    t.string('mime_type');
    t.integer('size');
    t.jsonb('meta');
    t.timestamps(true, true);
    t.foreign('property_id').references('properties.id').onDelete('CASCADE');
  });

  await knex.schema.createTable('assignments', function(t){
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    t.string('property_id').notNullable();
    t.uuid('assignee_id');
    t.string('assignee_type'); // agent|builder
    t.timestamps(true, true);
    t.foreign('property_id').references('properties.id').onDelete('CASCADE');
    t.foreign('assignee_id').references('users.id').onDelete('CASCADE');
  });
};

exports.down = async function(knex) {
  await knex.schema.dropTableIfExists('assignments');
  await knex.schema.dropTableIfExists('attachments');
  await knex.schema.dropTableIfExists('properties');
  await knex.schema.dropTableIfExists('users');
};
