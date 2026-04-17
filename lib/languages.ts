/**
 * CodeOrbit Language Registry
 * Judge0 CE language IDs: https://ce.judge0.com/languages/
 */

export type Language = {
  /** Judge0 CE language ID */
  id: number;
  /** Display label shown in UI */
  label: string;
  /** Monaco Editor language identifier */
  monaco: string;
  /** Starter code shown in a fresh room */
  starter: string;
  /** Tailwind/CSS color class for accent badge */
  color: string;
  /** Whether this language requires compilation before execution */
  compiled: boolean;
  /** File extension (used for display) */
  ext: string;
};

export const languages: Language[] = [
  {
    id: 63,
    label: "JavaScript",
    monaco: "javascript",
    ext: ".js",
    color: "#f7df1e",
    compiled: false,
    starter: `// JavaScript — CodeOrbit
console.log("Hello from CodeOrbit!");

// Try something interactive:
const nums = [1, 2, 3, 4, 5];
const sum = nums.reduce((acc, n) => acc + n, 0);
console.log("Sum:", sum);`
  },
  {
    id: 71,
    label: "Python",
    monaco: "python",
    ext: ".py",
    color: "#3572A5",
    compiled: false,
    starter: `# Python — CodeOrbit
print("Hello from CodeOrbit!")

# Try something interactive:
nums = [1, 2, 3, 4, 5]
total = sum(nums)
print(f"Sum: {total}")`
  },
  {
    id: 54,
    label: "C++",
    monaco: "cpp",
    ext: ".cpp",
    color: "#f34b7d",
    compiled: true,
    starter: `// C++ — CodeOrbit
#include <iostream>
#include <vector>
#include <numeric>

int main() {
    std::cout << "Hello from CodeOrbit!" << std::endl;

    std::vector<int> nums = {1, 2, 3, 4, 5};
    int sum = std::accumulate(nums.begin(), nums.end(), 0);
    std::cout << "Sum: " << sum << std::endl;

    return 0;
}`
  },
  {
    id: 62,
    label: "Java",
    monaco: "java",
    ext: ".java",
    color: "#b07219",
    compiled: true,
    starter: `// Java — CodeOrbit
import java.util.Arrays;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CodeOrbit!");

        int[] nums = {1, 2, 3, 4, 5};
        int sum = Arrays.stream(nums).sum();
        System.out.println("Sum: " + sum);
    }
}`
  },
  {
    id: 50,
    label: "C",
    monaco: "c",
    ext: ".c",
    color: "#555555",
    compiled: true,
    starter: `// C — CodeOrbit
#include <stdio.h>

int main() {
    printf("Hello from CodeOrbit!\\n");

    int nums[] = {1, 2, 3, 4, 5};
    int sum = 0;
    for (int i = 0; i < 5; i++) sum += nums[i];
    printf("Sum: %d\\n", sum);

    return 0;
}`
  },
  {
    id: 74,
    label: "TypeScript",
    monaco: "typescript",
    ext: ".ts",
    color: "#2b7489",
    compiled: true,
    starter: `// TypeScript — CodeOrbit
const greet = (name: string): string => \`Hello, \${name}!\`;
console.log(greet("CodeOrbit"));

// Type-safe sum
const nums: number[] = [1, 2, 3, 4, 5];
const sum: number = nums.reduce((acc: number, n: number) => acc + n, 0);
console.log("Sum:", sum);`
  },
  {
    id: 73,
    label: "Rust",
    monaco: "rust",
    ext: ".rs",
    color: "#dea584",
    compiled: true,
    starter: `// Rust — CodeOrbit
fn main() {
    println!("Hello from CodeOrbit!");

    let nums = vec![1, 2, 3, 4, 5];
    let sum: i32 = nums.iter().sum();
    println!("Sum: {}", sum);
}`
  },
  {
    id: 60,
    label: "Go",
    monaco: "go",
    ext: ".go",
    color: "#00ADD8",
    compiled: true,
    starter: `// Go — CodeOrbit
package main

import "fmt"

func main() {
    fmt.Println("Hello from CodeOrbit!")

    nums := []int{1, 2, 3, 4, 5}
    sum := 0
    for _, n := range nums {
        sum += n
    }
    fmt.Println("Sum:", sum)
}`
  },
  {
    id: 46,
    label: "Bash",
    monaco: "shell",
    ext: ".sh",
    color: "#89e051",
    compiled: false,
    starter: `#!/bin/bash
# Bash — CodeOrbit
echo "Hello from CodeOrbit!"

nums=(1 2 3 4 5)
sum=0
for n in "\${nums[@]}"; do
  sum=$((sum + n))
done
echo "Sum: $sum"`
  },
  {
    id: 68,
    label: "PHP",
    monaco: "php",
    ext: ".php",
    color: "#4F5D95",
    compiled: false,
    starter: `<?php
// PHP — CodeOrbit
echo "Hello from CodeOrbit!\\n";

$nums = [1, 2, 3, 4, 5];
$sum = array_sum($nums);
echo "Sum: $sum\\n";`
  }
];

export function languageByMonaco(monaco: string): Language {
  return languages.find((lang) => lang.monaco === monaco) ?? languages[0];
}

export function languageById(id: number): Language | undefined {
  return languages.find((lang) => lang.id === id);
}

/** All Monaco language identifiers — used for Zod validation */
export const VALID_MONACO_IDS = languages.map((l) => l.monaco) as [string, ...string[]];
