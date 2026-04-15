-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Apr 15, 2026 at 10:56 AM
-- Server version: 11.4.9-MariaDB-cll-lve
-- PHP Version: 8.1.34

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `gymbuddy_database_1`
--

-- --------------------------------------------------------

--
-- Table structure for table `booking`
--

CREATE TABLE `booking` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `status` enum('Pending','Confirmed','Cancel') NOT NULL DEFAULT 'Pending',
  `datetime_created` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `customer_booking_history`
-- (See below for the actual view)
--
CREATE TABLE `customer_booking_history` (
`customer_id` int(11)
,`customer_name` varchar(100)
,`booking_id` int(11)
,`session_title` varchar(100)
,`start_time` datetime
,`end_time` datetime
,`trainer_name` varchar(100)
,`status` enum('Pending','Confirmed','Cancel') DEFAULT 'Pending'
,`booked_on` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `matched_trainer_customer`
-- (See below for the actual view)
--
CREATE TABLE `matched_trainer_customer` (
`booking_id` int(11)
,`session_id` int(11)
,`session_title` varchar(100)
,`start_time` datetime
,`trainer_id` int(11)
,`trainer_name` varchar(100)
,`trainer_email` varchar(100)
,`customer_id` int(11)
,`customer_name` varchar(100)
,`customer_email` varchar(100)
,`status` enum('Pending','Confirmed','Cancel') DEFAULT 'Confirmed'
,`datetime_created` datetime
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `member_progress_summary`
-- (See below for the actual view)
--
CREATE TABLE `member_progress_summary` (
`progress_id` int(11)
,`member_id` int(11)
,`member_name` varchar(100)
,`activity` varchar(100)
,`duration` int(11)
,`note` varchar(200)
,`recorded_at` datetime
);

-- --------------------------------------------------------

--
-- Table structure for table `progress`
--

CREATE TABLE `progress` (
  `id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `booking_id` int(11) DEFAULT NULL,
  `activity` varchar(100) NOT NULL,
  `duration` int(11) NOT NULL,
  `note` varchar(200) NOT NULL,
  `jam_nyatat` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` int(11) NOT NULL,
  `session_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `rating_score` tinyint(4) NOT NULL CHECK (`rating_score` between 1 and 5),
  `comment` text DEFAULT NULL,
  `datetime_created` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Table structure for table `session`
--

CREATE TABLE `session` (
  `id` int(11) NOT NULL,
  `title` varchar(100) NOT NULL,
  `deskripsi` varchar(200) DEFAULT NULL,
  `trainer_id` int(11) NOT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime DEFAULT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` enum('scheduled','ongoing','completed','cancelled') NOT NULL DEFAULT 'scheduled',
  `updated_at` datetime DEFAULT NULL ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

-- --------------------------------------------------------

--
-- Stand-in structure for view `session_participants`
-- (See below for the actual view)
--
CREATE TABLE `session_participants` (
`session_id` int(11)
,`title` varchar(100)
,`start_time` datetime
,`end_time` datetime
,`price` decimal(10,2)
,`trainer_name` varchar(100)
,`confirmed_participants` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `session_reviews_summary`
-- (See below for the actual view)
--
CREATE TABLE `session_reviews_summary` (
`review_id` int(11)
,`session_id` int(11)
,`session_title` varchar(100)
,`trainer_name` varchar(100)
,`customer_name` varchar(100)
,`rating_score` tinyint(4)
,`comment` text
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `trainer_schedule`
-- (See below for the actual view)
--
CREATE TABLE `trainer_schedule` (
`trainer_id` int(11)
,`trainer_name` varchar(100)
,`session_id` int(11)
,`title` varchar(100)
,`start_time` datetime
,`end_time` datetime
,`confirmed_customers` bigint(21)
);

-- --------------------------------------------------------

--
-- Stand-in structure for view `upcoming_sessions_for_members`
-- (See below for the actual view)
--
CREATE TABLE `upcoming_sessions_for_members` (
`session_id` int(11)
,`title` varchar(100)
,`deskripsi` varchar(200)
,`start_time` datetime
,`end_time` datetime
,`price` decimal(10,2)
,`trainer_name` varchar(100)
,`confirmed_bookings` bigint(21)
);

-- --------------------------------------------------------

--
-- Table structure for table `user`
--

CREATE TABLE `user` (
  `id` int(11) NOT NULL,
  `nama` varchar(100) NOT NULL,
  `email` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('customer','trainer','admin') NOT NULL DEFAULT 'customer',
  `propinsi` varchar(45) NOT NULL,
  `kota` varchar(45) NOT NULL,
  `created_at` datetime DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COLLATE=latin1_swedish_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `booking`
--
ALTER TABLE `booking`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `unique_booking` (`session_id`,`member_id`),
  ADD KEY `member_id` (`member_id`),
  ADD KEY `idx_status` (`status`);

--
-- Indexes for table `progress`
--
ALTER TABLE `progress`
  ADD PRIMARY KEY (`id`),
  ADD KEY `member_id` (`member_id`),
  ADD KEY `progress_ibfk_booking` (`booking_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_id` (`session_id`),
  ADD KEY `member_id` (`member_id`),
  ADD KEY `idx_rating` (`rating_score`);

--
-- Indexes for table `session`
--
ALTER TABLE `session`
  ADD PRIMARY KEY (`id`),
  ADD KEY `session_ibfk_trainer` (`trainer_id`),
  ADD KEY `idx_start_time` (`start_time`);

--
-- Indexes for table `user`
--
ALTER TABLE `user`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD KEY `idx_role` (`role`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `booking`
--
ALTER TABLE `booking`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `progress`
--
ALTER TABLE `progress`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `session`
--
ALTER TABLE `session`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `user`
--
ALTER TABLE `user`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------

--
-- Structure for view `customer_booking_history`
--
DROP TABLE IF EXISTS `customer_booking_history`;

CREATE VIEW `customer_booking_history` AS SELECT `customer`.`id` AS `customer_id`, `customer`.`nama` AS `customer_name`, `b`.`id` AS `booking_id`, `s`.`title` AS `session_title`, `s`.`start_time` AS `start_time`, `s`.`end_time` AS `end_time`, `trainer`.`nama` AS `trainer_name`, `b`.`status` AS `status`, `b`.`datetime_created` AS `booked_on` FROM (((`booking` `b` join `session` `s` on(`b`.`session_id` = `s`.`id`)) join `user` `customer` on(`b`.`member_id` = `customer`.`id`)) join `user` `trainer` on(`s`.`trainer_id` = `trainer`.`id`)) WHERE `customer`.`role` = 'customer' ORDER BY `customer`.`id` ASC, `s`.`start_time` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `matched_trainer_customer`
--
DROP TABLE IF EXISTS `matched_trainer_customer`;

CREATE VIEW `matched_trainer_customer` AS SELECT `b`.`id` AS `booking_id`, `s`.`id` AS `session_id`, `s`.`title` AS `session_title`, `s`.`start_time` AS `start_time`, `trainer`.`id` AS `trainer_id`, `trainer`.`nama` AS `trainer_name`, `trainer`.`email` AS `trainer_email`, `customer`.`id` AS `customer_id`, `customer`.`nama` AS `customer_name`, `customer`.`email` AS `customer_email`, `b`.`status` AS `status`, `b`.`datetime_created` AS `datetime_created` FROM (((`booking` `b` join `session` `s` on(`b`.`session_id` = `s`.`id`)) join `user` `trainer` on(`s`.`trainer_id` = `trainer`.`id`)) join `user` `customer` on(`b`.`member_id` = `customer`.`id`)) WHERE `b`.`status` = 'Confirmed' ;

-- --------------------------------------------------------

--
-- Structure for view `member_progress_summary`
--
DROP TABLE IF EXISTS `member_progress_summary`;

CREATE VIEW `member_progress_summary` AS SELECT `p`.`id` AS `progress_id`, `u`.`id` AS `member_id`, `u`.`nama` AS `member_name`, `p`.`activity` AS `activity`, `p`.`duration` AS `duration`, `p`.`note` AS `note`, `p`.`jam_nyatat` AS `recorded_at` FROM (`progress` `p` join `user` `u` on(`p`.`member_id` = `u`.`id`)) WHERE `u`.`role` = 'customer' ORDER BY `p`.`jam_nyatat` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `session_participants`
--
DROP TABLE IF EXISTS `session_participants`;

CREATE VIEW `session_participants` AS SELECT `s`.`id` AS `session_id`, `s`.`title` AS `title`, `s`.`start_time` AS `start_time`, `s`.`end_time` AS `end_time`, `s`.`price` AS `price`, `trainer`.`nama` AS `trainer_name`, count(`b`.`id`) AS `confirmed_participants` FROM ((`session` `s` join `user` `trainer` on(`s`.`trainer_id` = `trainer`.`id`)) left join `booking` `b` on(`b`.`session_id` = `s`.`id` and `b`.`status` = 'Confirmed')) GROUP BY `s`.`id`, `s`.`title`, `s`.`start_time`, `s`.`end_time`, `s`.`price`, `trainer`.`nama` ;

-- --------------------------------------------------------

--
-- Structure for view `session_reviews_summary`
--
DROP TABLE IF EXISTS `session_reviews_summary`;

CREATE VIEW `session_reviews_summary` AS SELECT `r`.`id` AS `review_id`, `s`.`id` AS `session_id`, `s`.`title` AS `session_title`, `trainer`.`nama` AS `trainer_name`, `customer`.`nama` AS `customer_name`, `r`.`rating_score` AS `rating_score`, `r`.`comment` AS `comment` FROM (((`reviews` `r` join `session` `s` on(`r`.`session_id` = `s`.`id`)) join `user` `trainer` on(`s`.`trainer_id` = `trainer`.`id`)) join `user` `customer` on(`r`.`member_id` = `customer`.`id`)) ORDER BY `r`.`id` DESC ;

-- --------------------------------------------------------

--
-- Structure for view `trainer_schedule`
--
DROP TABLE IF EXISTS `trainer_schedule`;

CREATE VIEW `trainer_schedule` AS SELECT `trainer`.`id` AS `trainer_id`, `trainer`.`nama` AS `trainer_name`, `s`.`id` AS `session_id`, `s`.`title` AS `title`, `s`.`start_time` AS `start_time`, `s`.`end_time` AS `end_time`, count(`b`.`id`) AS `confirmed_customers` FROM ((`user` `trainer` join `session` `s` on(`trainer`.`id` = `s`.`trainer_id`)) left join `booking` `b` on(`b`.`session_id` = `s`.`id` and `b`.`status` = 'Confirmed')) WHERE `trainer`.`role` = 'trainer' AND `s`.`start_time` > current_timestamp() GROUP BY `trainer`.`id`, `trainer`.`nama`, `s`.`id`, `s`.`title`, `s`.`start_time`, `s`.`end_time` ORDER BY `trainer`.`nama` ASC, `s`.`start_time` ASC ;

-- --------------------------------------------------------

--
-- Structure for view `upcoming_sessions_for_members`
--
DROP TABLE IF EXISTS `upcoming_sessions_for_members`;

CREATE VIEW `upcoming_sessions_for_members` AS SELECT `s`.`id` AS `session_id`, `s`.`title` AS `title`, `s`.`deskripsi` AS `deskripsi`, `s`.`start_time` AS `start_time`, `s`.`end_time` AS `end_time`, `s`.`price` AS `price`, `trainer`.`nama` AS `trainer_name`, count(`b`.`id`) AS `confirmed_bookings` FROM ((`session` `s` join `user` `trainer` on(`s`.`trainer_id` = `trainer`.`id`)) left join `booking` `b` on(`b`.`session_id` = `s`.`id` and `b`.`status` = 'Confirmed')) WHERE `s`.`start_time` > current_timestamp() GROUP BY `s`.`id`, `s`.`title`, `s`.`deskripsi`, `s`.`start_time`, `s`.`end_time`, `s`.`price`, `trainer`.`nama` ;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `booking`
--
ALTER TABLE `booking`
  ADD CONSTRAINT `booking_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `session` (`id`),
  ADD CONSTRAINT `booking_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `progress`
--
ALTER TABLE `progress`
  ADD CONSTRAINT `progress_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`),
  ADD CONSTRAINT `progress_ibfk_booking` FOREIGN KEY (`booking_id`) REFERENCES `booking` (`id`);

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `session` (`id`),
  ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `user` (`id`);

--
-- Constraints for table `session`
--
ALTER TABLE `session`
  ADD CONSTRAINT `session_ibfk_trainer` FOREIGN KEY (`trainer_id`) REFERENCES `user` (`id`) ON UPDATE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
